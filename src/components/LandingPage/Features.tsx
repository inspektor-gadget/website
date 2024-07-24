import style from "./Features.module.css";
import Expandable from "./expandable.svg";
import Maps from "./maps.svg";
import Flexible from "./flexible.svg";
import clsx from "clsx";

export function Features() {
  return (
    <section className={style.section}>
      <div className={style.container}>
        <h2>The Inspektor has arrived</h2>
        <p className={style.description}>
          All the tools you need to investigate your cluster’s toughest issues
        </p>
        <div className={clsx(style.features)}>
          <div className={style.feature}>
            <Expandable />
            <h3>Expandable</h3>
            <p className={style.featureDescription}>
              Expanding BPF usage from single nodes to across the entire cluster
            </p>
          </div>
          <div className={style.feature}>
            <Maps />
            <h3>Maps</h3>
            <p className={style.featureDescription}>
              Maps low-level Linux resources to high-level Kubernetes concepts
            </p>
          </div>
          <div className={style.feature}>
            <Flexible />
            <h3>Flexible</h3>
            <p className={style.featureDescription}>
              Use stand-alone or integrate into your own tooling
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
