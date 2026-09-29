import { Suspense } from 'react';
import CreatorsClient from './CreatorsClient';

export default function CreatorsPage(){
  return (
    <Suspense fallback={<main className="innerPage" />}>
      <CreatorsClient />
    </Suspense>
  );
}
