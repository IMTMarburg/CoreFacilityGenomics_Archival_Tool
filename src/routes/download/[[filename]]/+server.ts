import fs from "fs";
import process from "process";

// ----- GET -----
/** @type {import('./$types').RequestHandler} */
export async function GET({ request, params }) {
  try {
    var pdf = JSON.stringify(params);
    let filename = params.filename ?? false;
    if (filename === false) {
      throw new Error("no filename");
    }

    let download_dir = process.env.DOWNLOAD_DIR;
    let path = `${download_dir}/${filename}`;
    //check if path exists
    if (!fs.existsSync(path)) {
      throw new Error(
        "file not found. Possibly, your download link has expired. Contact the facility for a new one.",
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
