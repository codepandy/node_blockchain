const fs = require("fs");
let EC = require("elliptic").ec;
let ec = new EC("secp256k1");

// 生成公私钥对
let keyPair = ec.genKeyPair();

// const res = {
//   prv: keyPair.getPrivate("hex").toString(), // 私钥
//   pub: keyPair.getPublic("hex").toString(), // 公钥
// };
// const aa = ec.keyFromPrivate(res.prv);
// const bb = {
//   prv: aa.getPrivate("hex").toString(), // 私钥
//   pub: aa.getPublic("hex").toString(), // 公钥
// };
// console.log(res);
// console.log(bb);

// 根据私钥算出公钥
function getPub(prv) {
  return ec
    .keyFromPrivate(prv)
    .getPublic("hex")
    .toString();
}

// 1. 获取公私钥对(持久化)
function generateKeys() {
  const fileName = "./wallet.json";
  try {
    let res = JSON.parse(fs.readFileSync(fileName));
    if (res.prv && res.pub && getPub(res.prv) === res.pub) {
      keyPair = ec.keyFromPrivate(res.prv);
      return res;
    } else {
      // 验证失败 重新生成
      throw "not valid wallet.json";
    }
  } catch (error) {
    // 文件不存在，或者文件内容不合法，重新生成
    const res = {
      prv: keyPair.getPrivate("hex").toString(), // 私钥
      pub: keyPair.getPublic("hex").toString(), // 公钥
    };
    fs.writeFileSync(fileName, JSON.stringify(res));
    return res;
  }
}
// 2.签名
function sign({ from, to, amount, timestamp }) {
  const bufferMsg = Buffer.from(`${timestamp}-${amount}-${from}-${to}`);
  let signature = Buffer.from(keyPair.sign(bufferMsg).toDER()).toString("hex");
  return signature;
}

// 3.校验签名
function verify({ from, to, amount, sig, timestamp }, pub) {
  try {
    // 验证是没有私钥的
    const keyPairMap = ec.keyFromPublic(pub, "hex");
    const bufferMsg = Buffer.from(`${timestamp}-${amount}-${from}-${to}`);
    return keyPairMap.verify(bufferMsg, sig);
  } catch (error) {
    console.log(error);
    return false;
  }
}
const keys = generateKeys();

module.exports = { sign, verify, keys };

// const keys = generateKeys();
// const trans = { from: "wenmu", to: "xiaozhu", amount: 100 };
// const signature = sign(trans);
// trans.signature = signature;
// console.log(signature);

// console.log(verify(trans, keys.pub));
