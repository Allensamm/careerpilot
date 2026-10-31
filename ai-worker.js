let handler = null;
const waiting = [];
self.onmessage = (event) => {
 if (handler) handler.onmessage(event);
 else waiting.push(event);
};
import("https://esm.run/@mlc-ai/web-llm@0.2.87").then(({ WebWorkerMLCEngineHandler }) => {
 handler = new WebWorkerMLCEngineHandler();
 waiting.splice(0).forEach((event) => handler.onmessage(event));
}).catch((error) => {
 self.postMessage({ type: "careerpilot-ai-worker-error", message: error && error.message ? error.message : "AI worker failed to load." });
});