import randomstring from "randomstring";

const TEST_VPC_NAME = process.env.TEST_VPC_NAME;
if (!TEST_VPC_NAME) {
  throw new Error("TEST_VPC_NAME environment variable not set");
}

const RANDOM_STRING = randomstring.generate({
  capitalization: "lowercase",
  charset: "alphanumeric",
  length: 5
});

// this is important to set as we are using this var in the serverless yml config
process.env.RANDOM_STRING = RANDOM_STRING;

const TEMP_DIR = `~/tmp/vpc-discovery-test-${RANDOM_STRING}`;

export {
  TEST_VPC_NAME,
  RANDOM_STRING,
  TEMP_DIR
};
