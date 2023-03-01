var fs = require("fs");
var files = fs.readdirSync("node_modules/.pnpm");

const fileSet = new Set();
const repeatSet = new Set();

for (let i = 0; i < files.length; ++i) {
  const parts = files[i].split("@", 3);

  if (parts[0] === "") {
    parts[0] = "@";
    parts[2] = "";
  } else {
    parts[1] = "";
  }

  files[i] = parts.join("");

  if (fileSet.has(files[i])) {
    repeatSet.add(files[i]);
  }

  fileSet.add(files[i]);
}

for (const file of repeatSet) {
  console.log(file);
}
