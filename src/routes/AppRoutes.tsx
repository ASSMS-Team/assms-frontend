import { Navigate, Route, Routes } from 'react-router-dom'

import CreateCustomerPage from '../pages/customers/CreateCustomerPage'

// The app's route table. New pages get an entry here rather than being reached
// from inside another component.
function AppRoutes() {
  return (
    <Routes>
      {/* Nothing lives at the root yet, so send it to the only real page. */}
      <Route path="/" element={<Navigate to="/customers/new" replace />} />
      <Route path="/customers/new" element={<CreateCustomerPage />} />
    </Routes>
  )
}

export default AppRoutes
