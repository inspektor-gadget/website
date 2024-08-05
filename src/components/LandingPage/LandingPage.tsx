import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Heading from "@theme/Heading";
import Layout from "@theme/Layout";
import clsx from "clsx";

import CncfLogo from "./cncf_light.svg";
import styles from "./LandingPage.module.css";
import { Features } from "./Features";
import { FeatureHighlight } from "./FeatureHighlight";

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={clsx(styles.heroBanner)}>
      <div className={clsx("container", styles.heroContainer)}>
        <Heading as="h1" className={styles.title}>
          Inspektor Gadget
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
      </div>
    </header>
  );
}

export default function LandingPage(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();

  return (
    <Layout wrapperClassName={styles.layoutWrapper}>
      <main>
        <HomepageHeader />
        <Features />
        <FeatureHighlight />

        <section className={clsx(styles.aboutContainer)}>
          <div className={clsx("container", styles.about)}>
            <p>
              We are a{" "}
              <a href="https://cncf.io" target="_blank">
                Cloud Native Computing Foundation
              </a>{" "}
              Sandbox Project.
            </p>
            <div
              style={{
                display: "flex",
                background: "#FFF",
                padding: "16px",
                borderRadius: "8px",
                maxWidth: "100%",
              }}
            >
              <CncfLogo width="100%" />
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
