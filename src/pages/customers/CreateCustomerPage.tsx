import CreateCustomerForm from '../../components/forms/CreateCustomerForm'

// Thin wrapper: title and layout only. Everything to do with the form - state,
// submission, error handling - belongs to the form component.
function CreateCustomerPage() {
  return (
    <main>
      <h1>Create customer</h1>
      <CreateCustomerForm />
    </main>
  )
}

export default CreateCustomerPage
