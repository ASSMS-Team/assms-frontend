import { Navigate, Route, Routes } from 'react-router-dom'

import AppLayout from '../components/layout/AppLayout'
import CreateCustomerPage from '../pages/customers/CreateCustomerPage'
import CustomerDetailPage from '../pages/customers/CustomerDetailPage'
import CustomerListPage from '../pages/customers/CustomerListPage'
import EditCustomerPage from '../pages/customers/EditCustomerPage'

// The app's route table. New pages get an entry here rather than being reached
// from inside another component.
function AppRoutes() {
  return (
    <Routes>
      {/* Every page renders inside the shared shell (top bar + content column). */}
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/customers" replace />} />
        <Route path="/customers" element={<CustomerListPage />} />
        {/* Ahead of ":id" for readability - React Router ranks the static
            segment higher either way, so /customers/new is never read as an id. */}
        <Route path="/customers/new" element={<CreateCustomerPage />} />
        <Route path="/customers/:id" element={<CustomerDetailPage />} />
        <Route path="/customers/:id/edit" element={<EditCustomerPage />} />
      </Route>
    </Routes>
  )
}

export default AppRoutes
