import { IonApp, IonRouterOutlet, setupIonicReact } from "@ionic/react";
import { IonReactRouter } from "@ionic/react-router";
import { Redirect, Route } from "react-router-dom";
import { useEffect } from "react";
import TrailsPage from "./pages/Trails";

/* Core CSS required for Ionic components to work properly */
import "@ionic/react/css/core.css";

/* Basic CSS for apps built with Ionic */
import "@ionic/react/css/normalize.css";
import "@ionic/react/css/structure.css";
import "@ionic/react/css/typography.css";

/* Optional CSS utils that can be commented out */
import "@ionic/react/css/padding.css";
import "@ionic/react/css/flex-utils.css";
import "@ionic/react/css/display.css";

/**
 * Ionic Dark Mode
 * -----------------------------------------------------
 * For more info, please see:
 * https://ionicframework.com/docs/theming/dark-mode
 */
import "@ionic/react/css/palettes/dark.class.css";

/* Theme variables */
import "@fontsource/nunito-sans/400.css";
import "@fontsource/nunito-sans/700.css";
import "./theme/variables.css";

setupIonicReact({ mode: "md" });

export default function App() {
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = (dark: boolean) => document.documentElement.classList.toggle("ion-palette-dark", dark);
    apply(media.matches);
    media.addEventListener("change", (e) => apply(e.matches));
  }, []);

  return (
    <IonApp>
      <IonReactRouter>
        <IonRouterOutlet>
          <Route exact path="/trails" component={TrailsPage} />
          <Route exact path="/">
            <Redirect to="/trails" />
          </Route>
        </IonRouterOutlet>
      </IonReactRouter>
    </IonApp>
  );
}
