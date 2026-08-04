import { describe, test, expect, beforeEach } from "vitest";
import { createApp } from "vue";
import { configureGlobals, globalOptions } from "../../src/vue/ioc";
import iconPlugin from "../../src/vue/ui/icons/plugin";
import loadingPlugin from "../../src/vue/ui/loading/plugin";
import pagingPlugin from "../../src/vue/ui/paging/plugin";
import modalPlugin from "../../src/vue/ui/modal/plugin";
import debugPlugin from "../../src/vue/debug/plugin";

// Every tag the plugins used to register app-wide before v3.2.5.
const TAGS = ["Icon", "IconButton", "Loading", "LoadingButton", "LoadingContainer", "Paging", "MyModal", "Debug"];

function installComponentPlugins(app) {
  app.use(iconPlugin);
  app.use(loadingPlugin, { img: "" });
  app.use(pagingPlugin);
  app.use(modalPlugin);
  app.use(debugPlugin);
}

describe("registerComponentsGlobally flag", () => {
  // globalOptions is a module-level singleton; reset to the default before each case.
  beforeEach(() => configureGlobals({ registerComponentsGlobally: false }));

  test("defaults to local imports — no component is registered app-wide", () => {
    expect(globalOptions.registerComponentsGlobally).toBe(false);

    const app = createApp({});
    installComponentPlugins(app);

    for (const tag of TAGS) {
      expect(app.component(tag)).toBeUndefined();
    }
  });

  test("registers the components app-wide when the flag is on", () => {
    configureGlobals({ registerComponentsGlobally: true });

    const app = createApp({});
    installComponentPlugins(app);

    for (const tag of TAGS) {
      expect(app.component(tag)).toBeTruthy();
    }
  });
});
