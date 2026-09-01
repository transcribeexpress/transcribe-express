import s3 from "@aws-sdk/client-s3";

const {
  GetBucketLifecycleConfigurationCommand,
  GetBucketVersioningCommand,
  GetObjectLockConfigurationCommand,
  S3Client,
} = s3;

const bucket = process.env.AWS_S3_BUCKET_NAME;
const region = process.env.AWS_REGION;

if (!bucket || !region) {
  throw new Error("AWS_S3_BUCKET_NAME and AWS_REGION are required for the read-only S3 audit");
}

const client = new S3Client({ region });

async function inspect(label, command, normalize) {
  try {
    const result = await client.send(command);
    return { label, available: true, ...normalize(result) };
  } catch (error) {
    const errorName = error instanceof Error ? error.name : "UnknownError";
    return {
      label,
      available: false,
      error: errorName,
    };
  }
}

const report = {
  bucket,
  region,
  readOnly: true,
  versioning: await inspect(
    "versioning",
    new GetBucketVersioningCommand({ Bucket: bucket }),
    ({ Status, MFADelete }) => ({ status: Status ?? "Disabled", mfaDelete: MFADelete ?? "Disabled" })
  ),
  lifecycle: await inspect(
    "lifecycle",
    new GetBucketLifecycleConfigurationCommand({ Bucket: bucket }),
    ({ Rules = [] }) => ({ ruleCount: Rules.length, enabledRuleCount: Rules.filter((rule) => rule.Status === "Enabled").length })
  ),
  objectLock: await inspect(
    "objectLock",
    new GetObjectLockConfigurationCommand({ Bucket: bucket }),
    ({ ObjectLockConfiguration }) => ({ enabled: ObjectLockConfiguration?.ObjectLockEnabled === "Enabled" })
  ),
};

console.log(JSON.stringify(report, null, 2));
