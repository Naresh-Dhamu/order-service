export interface MessageBroker {
  connectConsumer(): Promise<void>;
  disconnectConsumer(): Promise<void>;
  consumeMessages(topics: string[], fromBeginning: boolean): Promise<void>;
}
