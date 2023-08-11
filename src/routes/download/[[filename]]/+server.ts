import fs from "fs";
import process from "process";
import { add_event, load_events } from "$lib/data";

// ----- GET -----
/** @type {import('./$types').RequestHandler} */
export async function GET({ request, params }) {
  try {
    var pdf = JSON.stringify(params);
    let filename = params.filename ?? false;
    if (filename === false) {
      throw new Error("no filename");
    }

    //filenames look like 2023-04-14_10-16-29_oldest_run_ever_hsenl.tar.gz
    //run is after date, and before final _
    let match = filename.match(
      /(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})_(.*)_[^_]+\.tar\.zstd/,
    );
    if (match == null) {
      throw new Error("failed to parse filename");
    }
    let run = match[2];

    let download_dir = process.env.DOWNLOAD_DIR;
    let path = `${download_dir}/${filename}`;
    //check if path exists
    if (!fs.existsSync(path)) {
      let events = await load_events();
      for (let event of events) {
        if (
          event["filename"] == filename &&
          event["type"] == "run_download_removed"
        ) {
          throw new Error(
            "Your download link has expired. Contact the core facility to possibly get a new one.",
          );
        }
      }

      throw new Error(
        "file not found. Possibly, your download link has expired. Contact the facility for a new one."
		+ path
      );
    }

    const filePath = path;
    const fileSize = fs.statSync(filePath).size;
    const range = request.headers.range;

    if (range) {
      // Handle range requests with resuming support
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(filePath, { start, end });
      const headers = {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunksize.toString(),
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename=${filename}`,
      };
      file.on("end", async () => {
        await add_event("run_downloaded", { run: run }, "public-web");
      });

      return new Response(file, {
        status: 206,
        headers,
      });
    } else {
      // Handle full file requests
      const headers = {
        "Content-Length": fileSize.toString(),
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename=${filename}`,
      };
      const file = fs.createReadStream(filePath);

      file.on("end", async () => {
        await add_event("run_downloaded", { run: run }, "public-web");
      });

      return new Response(file, {
        status: 200,
        headers,
      });
    }
  } catch (error) {
    return new Response(error.message, {
      status: 500,
      content_type: "text/html",
    });
  }
}
