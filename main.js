const fs = require("node:fs");
const path = require("node:path");
const Parser = require("tree-sitter");
const Implementation = require("tree-sitter-ocaml").ocaml;
const Interface = require("tree-sitter-ocaml").interface;
const { TextDocument } = require("vscode-languageserver-textdocument");
const glob = require("glob");

const { Query } = Parser;

const parserImplementation = new Parser();
const parserInterface = new Parser();

parserImplementation.setLanguage(Implementation);
parserInterface.setLanguage(Interface);

const root = process.argv.at(-1);

// Folders: syntax, ml, frontend, common, core, gentype, bsc, jsoo, ext
const mlFiles = glob.globSync(
  `${root}/jscomp/{syntax,ml,frontend,common,core,gentype,bsc,jsoo,ext}/**/*.ml*`,
  {
    ignore: path.join(root, "jscomp", "syntax", "tests") + "/**",
  },
);

const files = mlFiles.map((path) => {
  return { path: path, content: fs.readFileSync(path).toString() };
});

const queryImplementation = new Query(
  Implementation,
  `
    [
      (value_name)
      (type_constructor)
      (field_name)
      (value_pattern)
      (label_name)
    ] @target
`,
);

const queryInterface = new Query(
  Interface,
  `
    [
      (value_name)
      (type_constructor)
      (field_name)
      (label_name)
    ] @target
`,
);

function formatCaptures(tree, captures) {
  return captures.map((c) => {
    const node = c.node;
    const { startPosition, endPosition } = node;
    delete c.node;
    // c.text = tree.getText(node);
    return { text: tree.getText(node), startPosition, endPosition };
  });
}

const camelToSnakeCase = (str) =>
  str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

function isCamelCase(text) {
  // Check if the text contains any uppercase letters
  if (/[A-Z]/.test(text)) {
    // Check if the first character is lowercase and there's at least one uppercase letter
    if (/^[a-z][a-zA-Z|0-9]*$/.test(text)) {
      return true; // It's in camelCase
    }
  }
  return false; // Not in camelCase
}

function applyRenameFile(file) {
  // if (file.path.endsWith(".mli")) {
  //   parser.setLanguage(Interface);
  // } else {
  //   parser.setLanguage(Implementation);
  // }

  let tree;

  const isInterface = file.path.endsWith(".mli");

  const parser = isInterface ? parserInterface : parserImplementation;

  try {
    tree = parser.parse(file.content, undefined, { bufferSize: 800000 });
  } catch (err) {
    throw new Error(file.path, { cause: err });
  }

  const query = isInterface ? queryInterface : queryImplementation;

  const captures = query.captures(tree.rootNode);

  const renames = formatCaptures(tree, captures)
    .filter((node) => isCamelCase(node.text))
    .map((node) => {
      return { ...node, newText: camelToSnakeCase(node.text) };
    });

  const document = TextDocument.create(
    `file://${file.path}`,
    "ocaml",
    0,
    file.content,
  );

  const textEdits = renames.map((rename) => {
    const { newText, startPosition, endPosition } = rename;
    return {
      newText,
      range: {
        start: { line: startPosition.row, character: startPosition.column },
        end: { line: endPosition.row, character: endPosition.column },
      },
    };
  });

  return TextDocument.applyEdits(document, textEdits);
}

const results = files.map((file) => {
  return { ...file, edits: applyRenameFile(file) };
});

results.forEach((result) => {
  fs.writeFileSync(result.path, result.edits);
});
