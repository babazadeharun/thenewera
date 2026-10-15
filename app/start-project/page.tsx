import './start-project-reference.css';
import { Suspense } from 'react';
import StartProjectClient from './StartProjectClient';

export default function StartProjectPage() {
  return (
    <Suspense fallback={<main className="innerPage briefReference" />}>
      <StartProjectClient />
    </Suspense>
  );
}