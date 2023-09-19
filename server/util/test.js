const crypto = require('crypto')
const Base64 = require('base-64')

let keyId = 'abcde';
let secret = 'xxxxxxxxxxxxxxxxyyyyyyyyyyyyyyyy'
function xiaoAiEncrypt(method, urlPath, param, xiaomiDate, host, contentType, md5) {
  const algorithmForMac = "sha256";
  const source = `${method}\n${urlPath}\n${param}\n${xiaomiDate}\n${host}\n${contentType}\n${md5}\n`;
  const decodedSecret = Base64.decode(secret);
  const hmac = crypto.createHmac(algorithmForMac, Buffer.from(decodedSecret, 'binary'));
  hmac.update(source, "utf8");
  const signature = hmac.digest('hex');
  return {
    source,
    signature
  };
}

function getTest() {
  const { source, signature } = xiaoAiEncrypt("GET", "/hmac/testGet", "id=xxxxx&name=abc", "Mon, 7 Aug 2017 08:00:50 GMT", "localhost:19001", "", "");
  console.log(source);
  console.log("==================================");
  console.log(signature);
  console.log(`Authorization: MIAI-HmacSHA256-V1 ${keyId}::${signature}`);
}

function postTest() {
  const { source, signature } = xiaoAiEncrypt("POST", "/hmac/testPost", "", "Mon, 7 Aug 2017 08:02:03 GMT", "localhost:19001", "application/x-www-form-urlencoded", "LvICVZWSXkBmN8URxZ1wlg==");
  console.log(source);
  console.log("==================================");
  console.log(signature);
  console.log(`Authorization: MIAI-HmacSHA256-V1 ${keyId}::${signature}`);
}

// getTest();
// postTest();