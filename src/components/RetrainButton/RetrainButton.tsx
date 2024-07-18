import { useDocumentData } from "../../contexts/DocumentDataContext.tsx";
import { DocumentData } from "../../interfaces/interfaces.ts";

const RetrainButton = () => {
    const { documentData } = useDocumentData();

    const sendDocumentDataToBackend = async (documentData: DocumentData) => {
        try {
            const response = await fetch('http://localhost:5001/retrain', { 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(documentData),
            });
    
            const responseData = await response.json();
    
            if (response.ok) {
                console.log('Document data sent successfully:', responseData.message);
                
            } else {
                console.error('Failed to send document data:', responseData.message);
               
            }
        } catch (error) {
            console.error('Error sending document data:', error);
            
        }
    };

    const handleClick = () => {
        if (documentData) {
            sendDocumentDataToBackend(documentData);
        } else {
            console.log('No document data to send');
        }
    };

    return (
        <button onClick={handleClick}>Save Document and retrain Models</button>
    );
};

export default RetrainButton;
