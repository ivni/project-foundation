import { readdir, readFile } from "node:fs/promises";

// Use only in a dedicated supervisor: adoption must never include caller-owned children.
export async function ownedProcessTree() {
  if (process.platform !== "linux")
    throw new Error("Managed commands require a verified Linux subreaper route");
  const { dlopen, FFIType } = await import("bun:ffi");
  const libc = dlopen("libc.so.6", {
    prctl: {
      args: [FFIType.i32, FFIType.u64, FFIType.u64, FFIType.u64, FFIType.u64],
      returns: FFIType.i32,
    },
    pidfd_open: { args: [FFIType.i32, FFIType.u32], returns: FFIType.i32 },
    pidfd_send_signal: {
      args: [FFIType.i32, FFIType.i32, FFIType.ptr, FFIType.u32],
      returns: FFIType.i32,
    },
    close: { args: [FFIType.i32], returns: FFIType.i32 },
  });
  if (libc.symbols.prctl(36, 1, 0, 0, 0) !== 0) {
    libc.close();
    throw new Error("Cannot enable dedicated child subreaper");
  }
  const ownFd = libc.symbols.pidfd_open(process.pid, 0);
  if (ownFd < 0 || libc.symbols.pidfd_send_signal(ownFd, 0, null, 0) !== 0) {
    if (ownFd >= 0) libc.symbols.close(ownFd);
    libc.close();
    throw new Error("Cannot use stable process descriptors");
  }
  libc.symbols.close(ownFd);
  // This dedicated supervisor has no unrelated children. Detached grandchildren are adopted
  // when their parent exits, so they remain observable even after changing process groups.
  const stat = async (pid: number) => {
    const raw = await readFile(`/proc/${pid}/stat`, "utf8");
    const fields = raw.slice(raw.lastIndexOf(")") + 2).split(" ");
    return { pid, state: fields[0], parent: Number(fields[1]), start: fields[19] };
  };
  const processTable = async () => {
    const seen = new Set<number>();
    const rows: Awaited<ReturnType<typeof stat>>[] = [];
    const visit = async (pid: number) => {
      if (seen.has(pid)) return;
      seen.add(pid);
      const exited = (error: unknown) => {
        // Exits during traversal are reconciled by another scan. Unreadable ownership is a
        // capability error, never an empty tree or permission to release the stage.
        if (!["ENOENT", "ESRCH"].includes((error as NodeJS.ErrnoException).code ?? "")) throw error;
      };
      let threads: string[];
      try {
        threads = await readdir(`/proc/${pid}/task`);
      } catch (error) {
        exited(error);
        return;
      }
      for (const tid of threads) {
        let ids: string;
        try {
          ids = await readFile(`/proc/${pid}/task/${tid}/children`, "utf8");
        } catch (error) {
          exited(error);
          continue;
        }
        for (const id of ids.trim().split(/\s+/).filter(Boolean)) {
          const child = Number(id);
          try {
            const row = await stat(child);
            if (row.parent !== pid) continue;
            if (row.state !== "Z") rows.push(row);
            await visit(child);
          } catch (error) {
            exited(error);
          }
        }
      }
    };
    await visit(process.pid);
    return rows;
  };
  try {
    await processTable();
  } catch (error) {
    libc.close();
    throw error;
  }
  const finish = async () => {
    const deadline = Date.now() + 5000;
    let emptyScans = 0;
    while (true) {
      const owned = await processTable();
      emptyScans = owned.length ? 0 : emptyScans + 1;
      if (emptyScans === 2) break;
      for (const row of owned) {
        const fd = libc.symbols.pidfd_open(row.pid, 0);
        try {
          const current = await stat(row.pid);
          if (current.start !== row.start || current.state === "Z") continue;
          if (fd < 0 || libc.symbols.pidfd_send_signal(fd, 9, null, 0) !== 0) {
            const after = await stat(row.pid);
            if (after.start === row.start && after.state !== "Z" && after.state !== "X")
              throw new Error("Cannot terminate owned process through stable descriptor");
          }
        } catch (error) {
          if (!["ENOENT", "ESRCH"].includes((error as NodeJS.ErrnoException).code ?? ""))
            throw error;
        } finally {
          if (fd >= 0) libc.symbols.close(fd);
        }
      }
      if (Date.now() >= deadline)
        throw new Error("Owned process tree is not terminal; retain ownership");
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  };
  return { finish, close: () => libc.close() };
}
