const NotFound = () => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#f0f4f7', // A softer, professional background
      color: '#495057',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      textAlign: 'center',
      padding: '2rem'
    }}>
      <h1 style={{
        fontSize: 'clamp(3rem, 10vw, 8rem)',
        fontWeight: 'bold',
        color: '#007bff', // A professional blue for the code
        margin: '0',
        lineHeight: '1'
      }}>
        404
      </h1>
      <h2 style={{
        fontSize: 'clamp(1.5rem, 5vw, 2.5rem)',
        fontWeight: 'normal',
        marginTop: '1rem',
        marginBottom: '1rem'
      }}>
        Page Not Found
      </h2>
      <p style={{
        fontSize: '1.1rem',
        maxWidth: '700px',
        lineHeight: '1.6',
        marginBottom: '1rem'
      }}>
        The page you were looking for might have been moved or doesn't exist. This could be due to a broken link or a temporary system issue.
      </p>

      <div style={{
        backgroundColor: '#e9ecef',
        padding: '1.5rem',
        borderRadius: '8px',
        border: '1px solid #ced4da',
        maxWidth: '600px',
        width: '100%',
        margin: '1.5rem 0'
      }}>
        <h3 style={{ margin: '0 0 1rem 0' }}>What can you do?</h3>
        <p style={{ margin: '0.5rem 0' }}>
          • Check your recent appointments or patient records from the homepage.
        </p>
        <p style={{ margin: '0.5rem 0' }}>
          • Use the navigation menu to find what you need.
        </p>
        <p style={{ margin: '0.5rem 0', color: '#dc3545' }}>
          • If you believe this is an error, please report it to our support team.
        </p>
      </div>

      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '1rem',
        marginTop: '1rem'
      }}>
        <a href="/" style={{
          padding: '0.8rem 1.5rem',
          fontSize: '1rem',
          color: '#fff',
          backgroundColor: '#007bff',
          border: 'none',
          borderRadius: '5px',
          textDecoration: 'none',
          transition: 'background-color 0.3s ease',
          fontWeight: 'bold'
        }}>
          Go to Homepage
        </a>
        <a href="mailto:support@youremrsolution.com" style={{
          padding: '0.8rem 1.5rem',
          fontSize: '1rem',
          color: '#007bff',
          backgroundColor: 'transparent',
          border: '1px solid #007bff',
          borderRadius: '5px',
          textDecoration: 'none',
          transition: 'background-color 0.3s ease',
          fontWeight: 'bold'
        }}>
          Report an Issue
        </a>
      </div>
    </div>
  );
};

export default NotFound;