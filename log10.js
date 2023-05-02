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
let sessionID = getSessionId();

const completionUrl = url.concat("/api/completions");

async function getCompletionID() {
  try {
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
    return completionID;
  } catch (e) {
    throw new Error("Failed to create LOG10 completion: " + e.message);
  }
}

function interceptFunction(fn) {
  return function (...args) {
    logger.info(
      `Calling function: ${fn.name}(${JSON.stringify(args, null, 2)})`
    );
    const startTime = performance.now();

    const completionID = getCompletionID();

    Promise.all([completionID, sessionID]).then(([completionID, sessionID]) =>
      axios.post(
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
      )
    );

    const output = fn.apply(this, args);

    return Promise.all([output, completionID]).then(
      ([output, completionID]) => {
        const duration = performance.now() - startTime;
        logger.info(`Function ${fn.name} returned: ${output} in ${duration}ms`);

        const currentStackFrame = stackTrace.get();
        const stacktrace = currentStackFrame.map((frame) => ({
          file: frame.getFileName(),
          line: frame.getLineNumber(),
          lineno: frame.getLineNumber(),
          name: frame.getFunctionName(),
        }));

        return axios
          .post(
            `${completionUrl}/${completionID}`,
            {
              response: JSON.stringify(output.data),
              status: "finished",
              duration: Math.round(duration),
              stacktrace: JSON.stringify(stacktrace),
            },
            {
              headers: {
                "x-log10-token": token,
                "Content-Type": "application/json",
              },
            }
          )
          .then(() => output);
      }
    );

    //   const currentStackFrame = stackTrace.get();
    //   const stacktrace = currentStackFrame.map((frame) => ({
    //     file: frame.getFileName(),
    //     line: frame.getLineNumber(),
    //     lineno: frame.getLineNumber(),
    //     name: frame.getFunctionName(),
    //   }));
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
