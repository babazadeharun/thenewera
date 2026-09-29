import { Suspense } from 'react';
import StartProjectClient from './StartProjectClient';

export default function StartProjectPage(){
  return (
    <Suspense fallback={<main className="container" />}>
      <StartProjectClient />
    </Suspense>
  );
}
