import { ORDER_LIFECYCLE_DEMO_ORDERS } from "@/lib/labs/reports/completion/order-lifecycle-demo";
import type {
  DemoQueueSnapshot,
  FetchLiveQueueParams,
  ReportsQueueProvider,
} from "@/lib/labs/reports/completion/queue-providers/types";

export const demoQueueProvider: ReportsQueueProvider = {
  mode: "demo",
  async fetchSnapshot(_params: FetchLiveQueueParams): Promise<DemoQueueSnapshot> {
    return {
      mode: "demo",
      orders: [...ORDER_LIFECYCLE_DEMO_ORDERS],
    };
  },
};
