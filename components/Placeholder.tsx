import styles from "./Placeholder.module.css";

/** 诚实「建设中」占位页：明确标注尚未接后端，不放任何会触发假提交的控件。 */
export default function Placeholder({
  eyebrow,
  title,
  accent,
  copy,
  symbol = "✦",
}: {
  eyebrow: string;
  title: string;
  accent?: string;
  copy: string;
  symbol?: string;
}) {
  return (
    <div className={styles.wrap}>
      <div className={styles.center}>
        <div className={styles.symbol} aria-hidden="true">
          {symbol}
        </div>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1 className={styles.title}>
          {title}
          {accent ? (
            <>
              {" "}
              <i>{accent}</i>
            </>
          ) : null}
        </h1>
        <p className={styles.copy}>{copy}</p>
        <span className={styles.tag}>建设中 · 尚未接后端</span>
      </div>
    </div>
  );
}
