import randomstring from "randomstring"

const TEST_VPC_NAME = process.env.TEST_VPC_NAME

if (!TEST_VPC_NAME) {
  throw new Error("TEST_DOMAIN environment variable not set")
}

function getRandomString (): string {
  return randomstring.generate({
    capitalization: "lowercase",
    charset: "alphanumeric",
    length: 5
  })
}

export {
  getRandomString,
  TEST_VPC_NAME
}
