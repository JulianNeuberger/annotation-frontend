import InputForm from './components/InputForm/InputForm.tsx';
import { DocumentDataProvider } from './contexts/DocumentDataContext.tsx';
import './App.css';
import { ConfigProvider, theme, Typography, Flex, Card, Steps } from 'antd';
import AnnotationContainer from './components/Annotation/AnnotationContainer.tsx';
import { useEffect, useState } from 'react';
import UndoRedoButtons from './components/Buttons/UndoRedoButton.tsx';
import { Workflow, stepDescriptions } from './utils/workflow_enum.ts';
import logger, { EventActionType } from './utils/eventLogger.ts';

const { Title } = Typography;

const stepToLogAction = {
    [Workflow.MENTION_SUGGESTION]: EventActionType.STEP_1,
    [Workflow.MENTION]: EventActionType.STEP_2,
    [Workflow.ENTITIES]: EventActionType.STEP_3,
    [Workflow.RELATION_SUGGESTION]: EventActionType.STEP_4,
    [Workflow.COMPLETE]: EventActionType.STEP_5,
};


const HomePage = () => {
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
    const [currentStep, setCurrentStep] = useState<number>(Workflow.INPUT);
    const [withVisualizedProgress, setWithVisualizedProgress] = useState<boolean>(true);


    useEffect(() => {
        if (currentStep !== Workflow.INPUT) {
            const action = stepToLogAction[currentStep];
            if (action) {
                logger.logEvent({
                    timestamp: Date.now(),
                    action: action,
                });
            }
        }
    }, [currentStep]);


    return (
        <DocumentDataProvider>
            <ConfigProvider theme={{
                algorithm: theme.darkAlgorithm,
            }}>
                <Flex vertical={true} gap='middle' justify='center'>
                    <Flex vertical={true}>
                        <Card styles={{ body: { paddingBottom: 0, paddingTop: 0 } }}>
                            <Flex justify='space-between' align='center'>
                                <Title >Annotation Editor</Title>
                                {isSubmitted && <UndoRedoButtons />}
                            </Flex>
                            <Steps current={currentStep} size='small' items={[
                                {
                                    title: 'Input',
                                    status: currentStep > Workflow.INPUT ? 'finish' : (currentStep === Workflow.INPUT ? 'process' : 'wait'),
                                },
                                {
                                    title: 'Mention Suggestion',
                                    status: currentStep > Workflow.MENTION_SUGGESTION ? 'finish' : (currentStep === Workflow.MENTION_SUGGESTION ? 'process' : 'wait'),
                                },
                                {
                                    title: 'Mentions',
                                    status: currentStep > Workflow.MENTION ? 'finish' : (currentStep === Workflow.MENTION ? 'process' : 'wait'),
                                },
                                {
                                    title: 'Entities',
                                    status: currentStep > Workflow.ENTITIES ? 'finish' : (currentStep === Workflow.ENTITIES ? 'process' : 'wait'),
                                },
                                {
                                    title: 'Relation Suggestion',
                                    status: currentStep > Workflow.RELATION_SUGGESTION ? 'finish' : (currentStep === Workflow.RELATION_SUGGESTION ? 'process' : 'wait'),
                                },
                                {
                                    title: 'Relations',
                                    status: currentStep >= Workflow.COMPLETE ? 'finish' : (currentStep === Workflow.COMPLETE ? 'process' : 'wait'),
                                },
                            ]} style={{ marginBottom: '15px' }} />
                            <Title level={3}>ToDo: {stepDescriptions[currentStep]}</Title>
                            {currentStep === Workflow.INPUT && <InputForm
                                isLoading={isLoading}
                                setIsLoading={setIsLoading}
                                isSubmitted={isSubmitted}
                                setIsSubmitted={setIsSubmitted}
                                setCurrentStep={setCurrentStep}
                                setWithVisualizedProgress={setWithVisualizedProgress}
                                withVisualizedProgress={withVisualizedProgress}
                            />}
                        </Card>
                    </Flex>
                    <AnnotationContainer
                        isLoading={isLoading}
                        currentStep={currentStep}
                        setCurrentStep={setCurrentStep}
                        withVisualizedProgress={withVisualizedProgress}
                    />
                </Flex>
            </ConfigProvider>
        </DocumentDataProvider>
    );
};

export default HomePage;
