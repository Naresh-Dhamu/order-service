export interface MessageBroker {
  connectProducer(): Promise<void>;
  disconnectProducer(): Promise<void>;
  sendMessage(topic: string, message: string): Promise<void>;
  connectConsumer(): Promise<void>;
  disconnectConsumer(): Promise<void>;
  consumeMessages(topics: string[], fromBeginning: boolean): Promise<void>;
}
