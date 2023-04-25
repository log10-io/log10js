const logger = require("loglevel");
const axios = require("axios");
require("dotenv").config();
const { performance } = require("perf_hooks");

const DEBUG = false;

logger.setLevel(DEBUG ? logger.levels.DEBUG : logger.levels.INFO);

url = process.env.LOG10_URL;
token = process.env.LOG10_TOKEN;
orgId = process.env.LOG10_ORG_ID;

async function getSessionId() {
  try {
    const sessionUrl = url + "/api/sessions";
    const res = await axios.post(
      sessionUrl,
      {
        organization_id: orgId,
      },
      {
        headers: {
          "x-log10-token": token,
          "Content-Type": "application/json",
        },
      }
    );

    return res.data.sessionID;
  } catch (e) {
    throw new Error("Failed to create LOG10 session: " + e.message);
  }
}

// Global variable to store the current sessionID.
let sessionID;
getSessionId()
  .then((id) => {
    sessionID = id;
    console.log(`Log10 sessionID: ${sessionID}`);
  })
  .catch((error) => {
    console.error(error);
  });

function interceptFunction(fn) {
  return async function (...args) {
    const stackTrace = await import("stack-trace");
    logger.info(`Calling function: ${fn.name}`);
    let output = null;
    try {
      const completionUrl = url.concat("/api/completions");
      const res = await axios.post(
        completionUrl,
        {
          organization_id: orgId,
        },
        {
          headers: {
            "x-log10-token": token,
            "Content-Type": "application/json",
          },
        }
      );
      const completionID = res.data.completionID;
      console.log(`Log10 completionID: ${completionID}`);
      const req = JSON.stringify(args[0]);
      console.log(`args = ${req}`);

      await axios.post(
        `${completionUrl}/${completionID}`,
        {
          status: "started",
          orig_module: fn.name,
          orig_qualname: "Completion.create", // todo backend needs to handle openai js lib
          request: JSON.stringify(args[0]),
          session_id: sessionID,
          organization_id: orgId,
        },
        {
          headers: {
            "x-log10-token": token,
            "Content-Type": "application/json",
          },
        }
      );

      const currentStackFrame = stackTrace.get();
      const stacktrace = currentStackFrame.map((frame) => ({
        file: frame.getFileName(),
        line: frame.getLineNumber(),
        lineno: frame.getLineNumber(),
        name: frame.getFunctionName(),
      }));

      const startTime = performance.now();
      const output = await fn.apply(this, args);
      const duration = performance.now() - startTime;
      console.log(`TIMED BLOCK - OpenAI call duration: ${duration}`);

      const logRow = {
        response: JSON.stringify(output.data),
        status: "finished",
        duration: Math.round(duration),
        stacktrace: JSON.stringify(stacktrace),
      };

      await axios.post(`${completionUrl}/${completionID}`, logRow, {
        headers: {
          "x-log10-token": token,
          "Content-Type": "application/json",
        },
      });
      return output;
    } catch (e) {
      console.error("failed", e);
    }
  };
}

function log10(constructor) {
  const wrappedConstructor = class extends constructor {
    constructor(...args) {
      super(...args);

      for (const propertyName of Object.getOwnPropertyNames(
        constructor.prototype
      )) {
        const propertyValue = this[propertyName];
        if (
          propertyName !== "constructor" &&
          typeof propertyValue === "function"
        ) {
          this[propertyName] = interceptFunction(propertyValue);
        }
      }
    }
  };

  return wrappedConstructor;
}

(module.exports = log10), getSessionId;
