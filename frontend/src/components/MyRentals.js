import React, { useState, useEffect, useCallback } from 'react';
import { useWeb3React } from '@web3-react/core';
import { Alert, Row, Col, Spinner, Container, Tabs, Tab } from 'react-bootstrap';
import Notification from './Notification';
import { useNotification } from '../hooks/useNotification';
import { contractAddress } from '../utils/contractConfig';
import { 
  handleReturnBook,
  loadAllRentalData
} from '../services/rentalsService';
import { 
  renderBookCard, 
  renderMyAvailableBooks, 
  renderMyRentedOutBooks 
} from './helpers/rentalComponents';

function MyRentals() {
  const { account, library, chainId } = useWeb3React();
  const { notification, showNotification, handleError, clearNotification } = useNotification();
  
  const [rentedBooks, setRentedBooks] = useState([]);
  const [myAvailableBooks, setMyAvailableBooks] = useState([]);
  const [myRentedOutBooks, setMyRentedOutBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [returningBookId, setReturningBookId] = useState(null);

  const handleLoadData = useCallback(async () => {
    await loadAllRentalData({
      library,
      account,
      setRentedBooks,
      setMyAvailableBooks,
      setMyRentedOutBooks,
      setLoading,
      handleError
    });
  }, [library, chainId, account, handleError]);

  useEffect(() => {
    handleLoadData();
    // Refresh rentals every 30 seconds
    const interval = setInterval(handleLoadData, 30000);
    return () => clearInterval(interval);
  }, [handleLoadData]);

  const handleReturn = async (bookId) => {
    await handleReturnBook({
      bookId,
      library,
      account,
      rentedBooks,
      setReturningBookId,
      showNotification,
      handleError,
      onSuccess: handleLoadData
    });
  };

  if (!account) {
    return (
      <Container className="py-5">
        <Alert variant="info">Please connect your wallet to view your rentals.</Alert>
      </Container>
    );
  }

  if (!contractAddress) {
    return (
      <Container className="py-5">
        <Alert variant="warning">Please switch to the correct network.</Alert>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <h2 className="mb-4">My Rentals</h2>
      <Notification
        show={notification.show}
        type={notification.type}
        message={notification.message}
        onClose={clearNotification}
      />

      <Tabs defaultActiveKey="rented" id="rental-tabs" className="mb-4">
        <Tab eventKey="rented" title="Books You're Renting">
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" role="status" />
            </div>
          ) : rentedBooks.length > 0 ? (
            <Row xs={1} md={2} lg={3} className="g-4">
              {rentedBooks.map(book => (
                <Col key={book.id}>
                  {renderBookCard(book, false, handleReturn, returningBookId)}
                </Col>
              ))}
            </Row>
          ) : (
            <Alert variant="info">You haven't rented any books.</Alert>
          )}
        </Tab>

        <Tab eventKey="available" title="My Available Books">
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" role="status" />
            </div>
          ) : (
            renderMyAvailableBooks(myAvailableBooks)
          )}
        </Tab>

        <Tab eventKey="rentedOut" title="Books Being Rented">
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" role="status" />
            </div>
          ) : (
            renderMyRentedOutBooks(myRentedOutBooks)
          )}
        </Tab>
      </Tabs>
    </Container>
  );
}

export default MyRentals;