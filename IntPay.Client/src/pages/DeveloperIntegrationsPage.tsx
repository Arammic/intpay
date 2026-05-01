import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useWebsiteTheme } from "@/components/WebsiteLayout";

const API_HOST = "https://int-pay.netlify.app";

const DeveloperIntegrationsPage = () => {
  const { theme } = useWebsiteTheme();
  const isDark = theme === "dark";

  return (
    <section className="mx-auto max-w-4xl space-y-8">
      <Link
        className={`inline-flex items-center gap-2 text-sm font-medium ${
          isDark ? "text-blue-300 hover:text-blue-200" : "text-blue-700 hover:text-blue-600"
        }`}
        to="/docs"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to docs
      </Link>

      <header className="space-y-3">
        <h1 className="text-4xl font-semibold tracking-tight">Developer integrations guide</h1>
        <p className={`text-lg ${isDark ? "text-slate-300" : "text-slate-700"}`}>
          Use Intent Pay in your website or app with our mock API shape and event flow.
        </p>
      </header>

      <div className={`rounded-xl border p-5 ${isDark ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white"}`}>
        <p className={`text-sm font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>Base host</p>
        <code className={`mt-2 block rounded-md px-3 py-2 text-sm ${isDark ? "bg-slate-800 text-slate-100" : "bg-slate-100 text-slate-900"}`}>
          {API_HOST}
        </code>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">Quick flow (mock)</h2>
        <ol className={`list-decimal space-y-2 pl-6 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
          <li>Create a payment intent for checkout.</li>
          <li>Confirm payment from your frontend.</li>
          <li>Listen for webhook events to update order state.</li>
          <li>Save transaction details in your own database.</li>
        </ol>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">Mock endpoints</h2>
        <div className={`rounded-xl border p-4 ${isDark ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white"}`}>
          <pre className={`overflow-x-auto text-sm ${isDark ? "text-slate-200" : "text-slate-800"}`}>
{`POST ${API_HOST}/api/v1/intents
GET  ${API_HOST}/api/v1/intents/{intent_id}
POST ${API_HOST}/api/v1/intents/{intent_id}/confirm
POST ${API_HOST}/api/v1/refunds
GET  ${API_HOST}/api/v1/transactions`}
          </pre>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">Request and response shape (mock)</h2>
        <div className={`rounded-xl border p-4 ${isDark ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white"}`}>
          <pre className={`overflow-x-auto text-sm ${isDark ? "text-slate-200" : "text-slate-800"}`}>
{`POST /api/v1/intents
{
  "amount": 4999,
  "currency": "USD",
  "customer_id": "cus_mock_123",
  "metadata": {
    "order_id": "order_9812"
  }
}

201 Created
{
  "id": "ip_intent_01",
  "status": "requires_confirmation",
  "client_secret": "ip_secret_mock_xxx",
  "amount": 4999,
  "currency": "USD"
}`}
          </pre>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">Webhook events (mock)</h2>
        <div className={`rounded-xl border p-4 ${isDark ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white"}`}>
          <pre className={`overflow-x-auto text-sm ${isDark ? "text-slate-200" : "text-slate-800"}`}>
{`POST /api/v1/webhooks
{
  "type": "intent.succeeded",
  "created_at": "2026-04-27T18:15:00.000Z",
  "data": {
    "intent_id": "ip_intent_01",
    "transaction_id": "txn_1001",
    "amount": 4999,
    "currency": "USD"
  }
}`}
          </pre>
        </div>
      </div>
    </section>
  );
};

export default DeveloperIntegrationsPage;
