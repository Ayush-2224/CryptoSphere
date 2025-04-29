import React from 'react';
import { Card, Badge, Button, Alert, Row, Col, Spinner } from 'react-bootstrap';
import { resolveIPFSUrl } from '../../utils/pinataConfig';

/**
 * Renders the transaction details for a book
 * @param {Object} book - The book object with rental information
 * @returns {JSX.Element} Transaction details component
 */
export const renderTransactionDetails = (book) => {
  return (
    <div className="transaction-details mt-4 p-3 bg-light rounded">
      <h6 className="mb-3"><i className="bi bi-info-circle me-2"></i>Rental Details</h6>
      <div className="mb-2">
        <strong>Duration:</strong> {book.rentalDuration} minutes
      </div>
      <div className="mb-2">
        <strong>Total Rent:</strong> {book.totalRent} ETH
        {parseFloat(book.totalRent) > parseFloat(book.deposit) && (
          <Badge bg="danger" className="ms-2">Exceeds Deposit</Badge>
        )}
      </div>
      {!book.isReturned && parseFloat(book.totalRent) > parseFloat(book.deposit) && (
        <div className="mb-2 text-danger">
          <strong>Extra Payment Needed:</strong> {(parseFloat(book.totalRent) - parseFloat(book.deposit)).toFixed(6)} ETH
        </div>
      )}
      {!book.isReturned && parseFloat(book.totalRent) <= parseFloat(book.deposit) && (
        <div className="mb-2">
          <strong>Estimated Refund:</strong> {book.estimatedRefund} ETH
        </div>
      )}
      {book.isReturned && (
        <>
          <div className="mb-2">
            <strong>Returned on:</strong> {book.returnTime.toLocaleDateString()}
          </div>
          {book.extraPayment && parseFloat(book.extraPayment) > 0 && (
            <div className="mb-2 text-danger">
              <strong>Extra Payment Made:</strong> {book.extraPayment} ETH
            </div>
          )}
          {parseFloat(book.refundAmount) > 0 && (
            <div className="mb-2 text-success">
              <strong>Refund Amount:</strong> {book.refundAmount} ETH
            </div>
          )}
        </>
      )}
    </div>
  );
};

/**
 * Renders a book card for currently rented or returned books
 * @param {Object} book - The book object
 * @param {boolean} isReturned - Whether the book has been returned
 * @param {Function} handleReturn - Handler for the return button
 * @param {number|null} returningBookId - ID of the book currently being returned
 * @returns {JSX.Element} Book card component
 */
export const renderBookCard = (book, isReturned = false, handleReturn, returningBookId) => (
  <Card className="h-100 book-card shadow-sm animate__animated animate__fadeIn mb-4">
    <Card.Header className={`${isReturned ? 'bg-success' : 'bg-warning'} text-white`}>
      <h5 className="mb-0">
        <i className={`bi ${isReturned ? 'bi-check-circle' : 'bi-hourglass-split'} me-2`}></i>
        {isReturned ? 'Returned' : 'Currently Rented'}: {book.title}
      </h5>
    </Card.Header>
    {book.coverImage && (
      <div className="book-cover-container">
        <img 
          src={resolveIPFSUrl(book.coverImage)} 
          alt={`Cover for ${book.title}`} 
          className="img-fluid book-cover-image w-100"
          style={{ 
            height: '250px', 
            objectFit: 'cover',
            backgroundColor: '#f8f9fa',
            border: '1px solid #dee2e6' 
          }}
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = 'https://via.placeholder.com/500x700?text=No+Image';
          }}
        />
      </div>
    )}
    <Card.Body>
      <Card.Text className="book-author mb-3">
        <strong><i className="bi bi-person me-2"></i>Author:</strong> {book.author}
      </Card.Text>
      <div className="book-description mb-3">
        <strong><i className="bi bi-card-text me-2"></i>Description:</strong> 
        <p className="mt-2">{book.description || "No description provided."}</p>
      </div>
      <Card.Text>
        <strong><i className="bi bi-currency-dollar me-2"></i>Price:</strong> {book.dailyPrice} ETH per minute
      </Card.Text>
      <Card.Text>
        <strong><i className="bi bi-shield-lock me-2"></i>Deposit:</strong> {book.deposit} ETH
      </Card.Text>
      <Card.Text>
        <strong><i className="bi bi-envelope me-2"></i>Contact:</strong> {book.email || "No email provided"}
      </Card.Text>

      {renderTransactionDetails(book)}
      
      {!isReturned && (
        <Button
          variant="primary"
          className="w-100 mt-3"
          onClick={() => handleReturn(book.id)}
          disabled={returningBookId === book.id}
        >
          {returningBookId === book.id ? (
            <>
              <Spinner
                as="span"
                animation="border"
                size="sm"
                role="status"
                aria-hidden="true"
                className="me-2"
              />
              Returning...
            </>
          ) : (
            <>
              <i className="bi bi-arrow-left-circle me-2"></i>
              Return Book
            </>
          )}
        </Button>
      )}
    </Card.Body>
    <Card.Footer className="text-muted">
      <small>
        <i className="bi bi-calendar-check me-1"></i>
        Rented on: {book.rentalStartTime.toLocaleString()}
      </small>
    </Card.Footer>
  </Card>
);

/**
 * Renders books rented out to others
 * @param {Array} myRentedOutBooks - Books rented out to others
 * @returns {JSX.Element} Rendered component
 */
export const renderMyRentedOutBooks = (myRentedOutBooks) => {
  if (myRentedOutBooks.length === 0) {
    return (
      <div className="empty-state animate__animated animate__fadeIn">
        <i className="bi bi-book text-muted"></i>
        <h3>No Books Rented Out</h3>
        <p>None of your books are currently rented by others.</p>
      </div>
    );
  }

  return (
    <Row>
      {myRentedOutBooks.map(book => (
        <Col key={book.id} md={6} lg={4}>
          <Card className="h-100 book-card shadow-sm animate__animated animate__fadeIn mb-4">
            <Card.Header className="bg-info text-white">
              <h5 className="mb-0">
                <i className="bi bi-arrow-right-circle me-2"></i>
                Your Book: {book.title}
              </h5>
              <Badge bg="warning" text="dark" className="ms-2 mt-1">Currently Rented</Badge>
            </Card.Header>
            {book.coverImage && (
              <div className="book-cover-container">
                <img 
                  src={resolveIPFSUrl(book.coverImage)} 
                  alt={`Cover for ${book.title}`} 
                  className="img-fluid book-cover-image w-100"
                  style={{ 
                    height: '250px', 
                    objectFit: 'cover',
                    backgroundColor: '#f8f9fa',
                    border: '1px solid #dee2e6' 
                  }}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://via.placeholder.com/500x700?text=No+Image';
                  }}
                />
              </div>
            )}
            <Card.Body>
              <Card.Text className="book-author mb-3">
                <strong><i className="bi bi-person me-2"></i>Author:</strong> {book.author}
              </Card.Text>
              <Card.Text>
                <strong><i className="bi bi-person-circle me-2"></i>Rented by:</strong> {book.renter.substring(0, 6)}...{book.renter.substring(38)}
              </Card.Text>
              <Card.Text>
                <strong><i className="bi bi-calendar me-2"></i>Rental started:</strong> {book.rentalStartTime.toLocaleString()}
              </Card.Text>
              <Card.Text>
                <strong><i className="bi bi-hourglass-split me-2"></i>Duration:</strong> {book.rentalDuration} minutes
              </Card.Text>
              <Card.Text>
                <strong><i className="bi bi-envelope me-2"></i>Your Contact:</strong> {book.email || "No email provided"}
              </Card.Text>
              <Alert variant="info" className="mb-0 mt-3">
                <i className="bi bi-info-circle me-2"></i>
                This book will be available again when the renter returns it.
              </Alert>
            </Card.Body>
            <Card.Footer className="text-muted">
              <small>
                <i className="bi bi-info-circle me-1"></i>
                Price: {book.dailyPrice} ETH per minute | Deposit: {book.deposit} ETH
              </small>
            </Card.Footer>
          </Card>
        </Col>
      ))}
    </Row>
  );
};

/**
 * Renders available books owned by the user
 * @param {Array} myAvailableBooks - Books available for rent
 * @returns {JSX.Element} Rendered component
 */
export const renderMyAvailableBooks = (myAvailableBooks) => {
  if (myAvailableBooks.length === 0) {
    return (
      <div className="empty-state animate__animated animate__fadeIn">
        <i className="bi bi-book text-muted"></i>
        <h3>No Available Books</h3>
        <p>You don't have any available books for rent.</p>
      </div>
    );
  }

  return (
    <Row>
      {myAvailableBooks.map(book => (
        <Col key={book.id} md={6} lg={4}>
          <Card className="h-100 book-card shadow-sm animate__animated animate__fadeIn mb-4">
            <Card.Header className="bg-primary text-white">
              <h5 className="mb-0">
                <i className="bi bi-book me-2"></i>
                Your Book: {book.title}
              </h5>
              <Badge bg="success" text="light" className="ms-2 mt-1">Available</Badge>
            </Card.Header>
            {book.coverImage && (
              <div className="book-cover-container">
                <img 
                  src={resolveIPFSUrl(book.coverImage)} 
                  alt={`Cover for ${book.title}`} 
                  className="img-fluid book-cover-image w-100"
                  style={{ 
                    height: '250px', 
                    objectFit: 'cover',
                    backgroundColor: '#f8f9fa',
                    border: '1px solid #dee2e6' 
                  }}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://via.placeholder.com/500x700?text=No+Image';
                  }}
                />
              </div>
            )}
            <Card.Body>
              <Card.Text className="book-author mb-3">
                <strong><i className="bi bi-person me-2"></i>Author:</strong> {book.author}
              </Card.Text>
              <div className="book-description mb-3">
                <strong><i className="bi bi-card-text me-2"></i>Description:</strong> 
                <p className="mt-2">{book.description || "No description provided."}</p>
              </div>
              <Card.Text>
                <strong><i className="bi bi-currency-dollar me-2"></i>Price:</strong> {book.dailyPrice} ETH per minute
              </Card.Text>
              <Card.Text>
                <strong><i className="bi bi-shield-lock me-2"></i>Deposit:</strong> {book.deposit} ETH
              </Card.Text>
              <Card.Text>
                <strong><i className="bi bi-envelope me-2"></i>Your Contact:</strong> {book.email || "No email provided"}
              </Card.Text>
              <Alert variant="success" className="mb-0 mt-3">
                <i className="bi bi-check-circle me-2"></i>
                This book is available for others to rent.
              </Alert>
            </Card.Body>
            <Card.Footer className="text-muted">
              <small>
                <i className="bi bi-info-circle me-1"></i>
                Listed by you
              </small>
            </Card.Footer>
          </Card>
        </Col>
      ))}
    </Row>
  );
}; 