# node 开发区块链

使用 node 基于以太坊开发的迷你区块链项目。

### 命令行方式执行程序

这个需要借助`vorpal`工具,安装后，就可以编写命令行中可使用的命令。

// index.js

```js
const vorpal = require("vorpal")();

// 执行了node index.js后，就进入了命令行模式，输入自定义的的命令，输出自定义的内容
vorpal.command("custom_command", '输出"bar".').action(function(args, callback) {
  // 输出的内容
  this.log("bar");
  callback();
});

// 先执行下帮助命令
vorpal.exec("help");
// 前缀显示的意思，就是是在命令行输入命令时，默认都是显示我们的盘符路径，这个我们可以自定义成我们自己的想要的内容
vorpal.delimiter("前缀显示$").show();
```

### 格式化命令行输出

使用`cli-table`,以表格的方式输出

```
npm install cli-table
```

### 非对称加密

使用`elliptic`实现非对称加密
