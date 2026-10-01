import { ArrowClockwise } from '@phosphor-icons/react';

export function PageLoading({ label = '正在加载' }: { label?: string }) {
  return <div className="page-state" role="status"><span className="loading-line" aria-hidden="true" />{label}</div>;
}

export function PageError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <div className="page-state page-state--error" role="alert"><p>{message}</p>{onRetry && <button className="button button--secondary" onClick={onRetry}><ArrowClockwise size={18} aria-hidden="true" />重试</button>}</div>;
}

