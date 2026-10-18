import styles from './LoadingFallback.module.css'

interface LoadingFallbackProps {
  message?: string
}

export default function LoadingFallback({ message = '加载中...' }: LoadingFallbackProps) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.spinner}>
        <div className={styles.dot} />
        <div className={styles.dot} />
        <div className={styles.dot} />
      </div>
      <p className={styles.message}>{message}</p>
    </div>
  )
}