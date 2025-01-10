'use client';
import { useParams } from 'next/navigation';
import React from 'react';

const page = () => {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const params = useParams();
  const { id } = params;
  return <div>repo no: {id}</div>;
};

export default page;
