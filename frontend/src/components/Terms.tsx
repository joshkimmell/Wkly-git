import React from 'react';
// import { useSearchParams, useNavigate } from 'react-router-dom';
import { TermsContent, EFFECTIVE_DATE } from './Footer';



const TermsPage: React.FC = () => {
  // const [searchParams] = useSearchParams();
  // const navigate = useNavigate();
  

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <p className="text-xs text-secondary-text">{EFFECTIVE_DATE}</p>
      <TermsContent />
    </div>
  );
};

export default TermsPage;
