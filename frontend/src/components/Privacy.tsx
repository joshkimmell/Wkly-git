import React from 'react';
// import { useSearchParams, useNavigate } from 'react-router-dom';
import { PrivacyContent } from './Footer';



const PrivacyPage: React.FC = () => {
  // const [searchParams] = useSearchParams();
  // const navigate = useNavigate();
  

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <PrivacyContent />
    </div>
  );
};

export default PrivacyPage;
