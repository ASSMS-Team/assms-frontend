import { Navigate, Route, Routes } from 'react-router-dom'

import AppLayout from '../components/layout/AppLayout'
import ProtectedRoute from '../auth/ProtectedRoute'
import RoleRoute from '../auth/RoleRoute'
import AssetDetailPage from '../pages/assets/AssetDetailPage'
import CreateAssetPage from '../pages/assets/CreateAssetPage'
import EditAssetPage from '../pages/assets/EditAssetPage'
import CreateCustomerPage from '../pages/customers/CreateCustomerPage'
import CustomerDetailPage from '../pages/customers/CustomerDetailPage'
import CustomerListPage from '../pages/customers/CustomerListPage'
import EditCustomerPage from '../pages/customers/EditCustomerPage'
import CreateJobPage from '../pages/jobs/CreateJobPage'
import JobsByStatusPage from '../pages/reports/JobsByStatusPage'
import LoginPage from '../pages/auth/LoginPage'
import ForbiddenPage from '../pages/auth/ForbiddenPage'

// The app's route table. New pages get an entry here rather than being reached
// from inside another component.
function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      {/* Every page renders inside the shared shell (top bar + content column). */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/customers" replace />} />
        <Route path="/customers" element={<CustomerListPage />} />
        <Route path="/customers/:id" element={<CustomerDetailPage />} />
        <Route path="/assets/:id" element={<AssetDetailPage />} />
        <Route path="/forbidden" element={<ForbiddenPage />} />
        <Route element={<RoleRoute roles={['Agent', 'Manager']} />}>
          <Route path="/customers/new" element={<CreateCustomerPage />} />
          <Route path="/customers/:id/edit" element={<EditCustomerPage />} />
          <Route path="/assets/new" element={<CreateAssetPage />} />
          <Route path="/assets/:id/edit" element={<EditAssetPage />} />
        </Route>
        <Route element={<RoleRoute roles={['Agent', 'Dispatcher', 'Manager']} />}>
          <Route path="/jobs/new" element={<CreateJobPage />} />
        </Route>
        <Route element={<RoleRoute roles={['Dispatcher', 'Manager']} />}>
          <Route path="/reports/jobs-by-status" element={<JobsByStatusPage />} />
        </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default AppRoutes
