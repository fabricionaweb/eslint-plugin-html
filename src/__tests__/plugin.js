"use strict"

const path = require("path")
const CLIEngine = require("eslint").CLIEngine
const plugin = require("..")

function execute(file, baseConfig) {
  if (!baseConfig) baseConfig = {}

  const cli = new CLIEngine({
    extensions: ["html"],
    baseConfig: {
      settings: baseConfig.settings,
      rules: Object.assign({
        "no-console": 2,
      }, baseConfig.rules),
    },
    ignore: false,
    useEslintrc: false,
  })
  cli.addPlugin("html", plugin)
  const results = cli.executeOnFiles([path.join(__dirname, "fixtures", file)]).results
  return results[0] && results[0].messages
}

it("should extract and remap messages", () => {
  const messages = execute("simple.html")

  expect(messages.length, 5)

  expect(messages[0].message).toBe("Unexpected console statement.")
  expect(messages[0].line).toBe(8)
  expect(messages[0].column).toBe(7)

  expect(messages[1].message).toBe("Unexpected console statement.")
  expect(messages[1].line).toBe(14)
  expect(messages[1].column).toBe(7)

  expect(messages[2].message).toBe("Unexpected console statement.")
  expect(messages[2].line).toBe(20)
  expect(messages[2].column).toBe(3)

  expect(messages[3].message).toBe("Unexpected console statement.")
  expect(messages[3].line).toBe(25)
  expect(messages[3].column).toBe(11)

  expect(messages[4].message).toBe("Unexpected console statement.")
  expect(messages[4].line).toBe(28)
  expect(messages[4].column).toBe(13)
})

it("should report correct line numbers with crlf newlines", () => {
  const messages = execute("crlf-newlines.html")

  expect(messages.length).toBe(1)

  expect(messages[0].message).toBe("Unexpected console statement.")
  expect(messages[0].line).toBe(8)
  expect(messages[0].column).toBe(7)
})

describe("html/indent setting", () => {
  it("should automatically compute indent when nothing is specified", () => {
    const messages = execute("indent-setting.html", {
      rules: {
        indent: [2, 2],
      },
    })

    expect(messages.length).toBe(0)
  })

  it("should work with a zero absolute indentation descriptor", () => {
    const messages = execute("indent-setting.html", {
      rules: {
        indent: [2, 2],
      },

      settings: {
        "html/indent": 0,
      },
    })

    expect(messages.length).toBe(3)

    // Only the first script is correctly indented (aligned on the first column)

    expect(messages[0].message).toMatch(/Expected indentation of 0 .* but found 2\./)
    expect(messages[0].line).toBe(16)

    expect(messages[1].message).toMatch(/Expected indentation of 0 .* but found 6\./)
    expect(messages[1].line).toBe(22)

    expect(messages[2].message).toMatch(/Expected indentation of 0 .* but found 10\./)
    expect(messages[2].line).toBe(28)
  })

  it("should work with a non-zero absolute indentation descriptor", () => {
    const messages = execute("indent-setting.html", {
      rules: {
        indent: [2, 2],
      },

      settings: {
        "html/indent": 2,
      },
    })

    expect(messages.length).toBe(7)

    // The first script is incorrect since the second line gets dedented
    expect(messages[0].message).toMatch(/Expected indentation of 2 .* but found 0\./)
    expect(messages[0].line).toBe(11)

    // The second script is correct.

    expect(messages[1].message).toMatch(/Expected indentation of 0 .* but found 6\./)
    expect(messages[1].line).toBe(22)

    expect(messages[2].message).toMatch(/Expected indentation of 8 .* but found 6\./)
    expect(messages[2].line).toBe(23)

    expect(messages[3].message).toMatch(/Expected indentation of 6 .* but found 4\./)
    expect(messages[3].line).toBe(24)


    expect(messages[4].message).toMatch(/Expected indentation of 0 .* but found 10\./)
    expect(messages[4].line).toBe(28)

    expect(messages[5].message).toMatch(/Expected indentation of 12 .* but found 10\./)
    expect(messages[5].line).toBe(29)

    expect(messages[6].message).toMatch(/Expected indentation of 10 .* but found 8\./)
    expect(messages[6].line).toBe(30)
  })

  it("should work with relative indentation descriptor", () => {
    const messages = execute("indent-setting.html", {
      rules: {
        indent: [2, 2],
      },

      settings: {
        "html/indent": "+2",
      },
    })

    expect(messages.length).toBe(4)

    // The first script is correct since it can't be dedented, but follows the indent
    // rule anyway.

    expect(messages[0].message).toMatch(/Expected indentation of 0 .* but found 2\./)
    expect(messages[0].line).toBe(16)

    // The third script is correct.

    expect(messages[1].message).toMatch(/Expected indentation of 0 .* but found 10\./)
    expect(messages[1].line).toBe(28)

    expect(messages[2].message).toMatch(/Expected indentation of 12 .* but found 4\./)
    expect(messages[2].line).toBe(29)

    expect(messages[3].message).toMatch(/Expected indentation of 10 .* but found 2\./)
    expect(messages[3].line).toBe(30)
  })
})

describe("html/report-bad-indent setting", () => {
  it("should report under-indented code with auto indent setting", () => {
    const messages = execute("report-bad-indent-setting.html", {
      settings: {
        "html/report-bad-indent": true,
      },
    })

    expect(messages.length).toBe(1)

    expect(messages[0].message).toBe("Bad line indentation.")
    expect(messages[0].line).toBe(10)
    expect(messages[0].column).toBe(1)
  })

  it("should report under-indented code with provided indent setting", () => {
    const messages = execute("report-bad-indent-setting.html", {
      settings: {
        "html/report-bad-indent": true,
        "html/indent": "+4",
      },
    })

    expect(messages.length).toBe(3)

    expect(messages[0].message).toBe("Bad line indentation.")
    expect(messages[0].line).toBe(9)
    expect(messages[0].column).toBe(1)

    expect(messages[1].message).toBe("Bad line indentation.")
    expect(messages[1].line).toBe(10)
    expect(messages[1].column).toBe(1)

    expect(messages[2].message).toBe("Bad line indentation.")
    expect(messages[2].line).toBe(11)
    expect(messages[2].column).toBe(1)
  })
})

describe("xml support", () => {
  it("consider .html files as HTML", () => {
    const messages = execute("cdata.html")

    expect(messages.length).toBe(1)

    expect(messages[0].message).toBe("Parsing error: Unexpected token <")
    expect(messages[0].fatal).toBe(true)
    expect(messages[0].line).toBe(10)
    expect(messages[0].column).toBe(7)
  })

  it("can be forced to consider .html files as XML", () => {
    const messages = execute("cdata.html", {
      settings: {
        "html/xml-mode": true,
      },
    })

    expect(messages.length).toBe(1)

    expect(messages[0].message).toBe("Unexpected console statement.")
    expect(messages[0].line).toBe(11)
    expect(messages[0].column).toBe(9)
  })

  it("consider .xhtml files as XML", () => {
    const messages = execute("cdata.xhtml")

    expect(messages.length).toBe(1)

    expect(messages[0].message).toBe("Unexpected console statement.")
    expect(messages[0].line).toBe(13)
    expect(messages[0].column).toBe(9)
  })

  it("can be forced to consider .xhtml files as HTML", () => {
    const messages = execute("cdata.xhtml", {
      settings: {
        "html/xml-mode": false,
      },
    })

    expect(messages.length).toBe(1)

    expect(messages[0].message).toBe("Parsing error: Unexpected token <")
    expect(messages[0].fatal).toBe(true)
    expect(messages[0].line).toBe(12)
    expect(messages[0].column).toBe(7)
  })
})

describe("lines-around-comment and multiple scripts", () => {
  it("should not warn with lines-around-comment if multiple scripts", () => {
    const messages = execute("simple.html", {
      "rules": {
        "lines-around-comment": ["error", { "beforeLineComment": true }],
      },
    })

    expect(messages.length).toBe(5)
  })
})

describe("fix ranges", () => {
  xit("should remap fix ranges", () => {
    const messages = execute("remap-fix-range.html", {
      "rules": {
        "no-extra-semi": ["error"],
      },
    })

    expect(messages.length).toBe(1)
    expect(messages[0].fix.range).toEqual([ 72, 73 ])
  })
})
