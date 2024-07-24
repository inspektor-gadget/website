import IdealImage from "@theme/IdealImage";
import styles from "./Image.module.css";

export function Image({ src, style }: { src: string; style: any }) {
  return (
    <IdealImage
      img={require("@site/static" + src)}
      alt=""
      className={styles.container}
      style={style}
    />
  );
}
