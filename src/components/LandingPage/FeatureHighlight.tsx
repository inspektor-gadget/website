import styles from "./FeatureHighlight.module.css";
import Gadgets from "./gadgets.svg";

export function FeatureHighlight() {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.content}>
          <h2>eBPF-based tooling</h2>
          <p>
            For investigating the toughest Kubernetes issues. Inspektor Gadget
            provides a wide selection of BPF tools to dig into your Kubernetes
            cluster
          </p>
        </div>
        <Gadgets className={styles.image} />
      </div>
    </section>
  );
}
