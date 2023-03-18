import { PathLike } from "fs";
import { stat } from "fs/promises";

export async function exists(path: PathLike): Promise<boolean> {
    return await stat(path)
        .then(() => true)
        .catch(() => false);
}
