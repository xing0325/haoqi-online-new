import styles from "./page.module.css";

export default function HomePage() {
  return (
    <section className={styles.view}>
      <div className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>
            <span className={styles.dot} aria-hidden="true" /> 2026 / 春季 · 此刻
          </p>
          <h1>
            星期三，
            <br />
            <i>慢一点</i>也没关系。
          </h1>
          <p className={styles.copy}>
            外壳与导航已就位。首页仪表盘（今天的课、课程动态、信用积分、阅读、在线状态）将在 Phase 4
            接入真数据。
          </p>
        </div>
      </div>

      <div className={styles.note}>
        <strong>Phase 1 · 设计系统 + 应用外壳</strong>
        <p>
          左侧 7 个空间入口已可切换；其中「此刻」「课程」后续接真数据，其余 5 个是诚实占位。顶栏搜索 /
          通知 /「发起一件事」暂为禁用态，不假装能用。
        </p>
      </div>
    </section>
  );
}
