import React from 'react';
// import { useSearchParams, useNavigate } from 'react-router-dom';
import { TermsContent } from './Footer';



const TermsPage: React.FC = () => {
  // const [searchParams] = useSearchParams();
  // const navigate = useNavigate();
  

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <TermsContent />
    </div>
  );
};

export default TermsPage;
