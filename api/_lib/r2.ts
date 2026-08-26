import crypto from "crypto";

interface S3Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicBase: string;
}

function getConfig(): S3Config {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  const publicBase = process.env.R2_PUBLIC_BASE;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicBase) {
    throw new Error("R2 is not configured");
  }

  return { accountId, accessKeyId, secretAccessKey, bucket, publicBase };
}

export function makeKeys(name: string): { full: string; thumb: string } {
  const safe = name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
  const ts = Date.now();
  return {
    full: `full/${ts}-${safe}.webp`,
    thumb: `thumb/${ts}-${safe}.webp`,
  };
}

interface PresignedRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
}

export async function presignUpload(key: string, contentType: string): Promise<string> {
  const config = getConfig();
  const endpoint = `https://${config.accountId}.r2.amazonaws.com`;
  const url = `${endpoint}/${config.bucket}/${key}`;

  const method = "PUT";
  const host = `${config.accountId}.r2.amazonaws.com`;
  const region = "auto";
  const service = "s3";
  const action = "aws4_request";

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]/g, "").split(".")[0] + "Z";
  const dateStamp = amzDate.slice(0, 8);

  const canonicalRequest =
    `${method}\n/${config.bucket}/${key}\n\n` +
    `content-type:${contentType}\nhost:${host}\nx-amz-content-sha256:UNSIGNED-PAYLOAD\nx-amz-date:${amzDate}\n\n` +
    `content-type;host;x-amz-content-sha256;x-amz-date\nUNSIGNED-PAYLOAD`;

  const canonicalRequestHash = crypto.createHash("sha256").update(canonicalRequest).digest("hex");

  const credentialScope = `${dateStamp}/${region}/${service}/${action}`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${canonicalRequestHash}`;

  const kSecret = `AWS4${config.secretAccessKey}`;
  const kDate = crypto.createHmac("sha256", kSecret).update(dateStamp).digest();
  const kRegion = crypto.createHmac("sha256", kDate).update(region).digest();
  const kService = crypto.createHmac("sha256", kRegion).update(service).digest();
  const kSigning = crypto.createHmac("sha256", kService).update(action).digest();
  const signature = crypto.createHmac("sha256", kSigning).update(stringToSign).digest("hex");

  const authHeader =
    `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=content-type;host;x-amz-content-sha256;x-amz-date, ` +
    `Signature=${signature}`;

  const query = new URLSearchParams({
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${config.accessKeyId}/${credentialScope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-SignedHeaders": "content-type;host;x-amz-content-sha256;x-amz-date",
    "X-Amz-Signature": signature,
  });

  return `${url}?${query.toString()}`;
}

export function publicUrl(key: string): string {
  const config = getConfig();
  return `${config.publicBase}/${key}`;
}
