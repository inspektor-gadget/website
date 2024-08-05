import style from "./Features.module.css";
import Gadgets from "./gadget.svg";
import KubernetesAndContainerAware from "./kubernetes.svg";
import BatteriesIncluded from "./battery.svg";
import clsx from "clsx";

export function Features() {
  return (
    <section className={style.section}>
      <div className={style.container}>
        <h2>Powerful Observability tooling</h2>
        <p className={style.description}>
          Leverage the power of eBPF to collect systems insights. Leverege Inspektor Gadget to make doing so fast and efficient.
        </p>
        <div className={clsx(style.features)}>
          <div className={style.feature}>
            <Gadgets />
            <h3>Gadgets</h3>
            <p className={style.featureDescription}>
              Gadgets encapsulate eBPF programs in deployable units for powerful and performant systems inspection
            </p>
          </div>
          <div className={style.feature}>
            <KubernetesAndContainerAware />
            <h3>K8s & Container Aware</h3>
            <p className={style.featureDescription}>
              Automatically map low-level systems information to high-level Kubernetes and container resources
            </p>
          </div>
          <div className={style.feature}>
            <BatteriesIncluded />
            <h3>Batteries Included</h3>
            <p className={style.featureDescription}>
              An observabilty framework with everything you need to collect, filter, format and export valuable systems data
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
