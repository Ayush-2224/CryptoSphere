import React from 'react';
import { Card, Badge, Button, Spinner } from 'react-bootstrap';
import { resolveIPFSUrl } from '../../utils/pinataConfig';

/**
 * Reusable BookCard component for displaying book information
 */
const BookCard = ({
  book,
  cardType = 'available', // 'available', 'rented', 'myBook', 'myRented', 'returned'
  actionButton = null,
  loading = false,
  onClick = null,
  extraContent = null,
}) => {
  // Determine header style based on card type
  const getHeaderStyle = () => {
    switch (cardType) {
      case 'available':
        return { bg: 'primary', icon: 'bi-book', text: book.title };
      case 'rented':
        return { bg: 'warning', icon: 'bi-hourglass-split', text: book.title };
      case 'myBook':
        return { bg: 'primary', icon: 'bi-book', text: `Your Book: ${book.title}` };
      case 'myRented':
        return { bg: 'info', icon: 'bi-arrow-right-circle', text: `Your Book: ${book.title}` };
      case 'returned':
        return { bg: 'success', icon: 'bi-check-circle', text: `Returned: ${book.title}` };
      default:
        return { bg: 'primary', icon: 'bi-book', text: book.title };
    }
  };

  // Get header style
  const headerStyle = getHeaderStyle();

  return (
    <Card className="h-100 book-card shadow-sm animate__animated animate__fadeIn mb-4">
      <Card.Header className={`bg-${headerStyle.bg} text-white`}>
        <h5 className="mb-0">
          <i className={`bi ${headerStyle.icon} me-2`}></i>
          {headerStyle.text}
        </h5>
        {cardType === 'rented' && (
          <Badge bg="warning" text="dark" className="ms-2 mt-1">Currently Rented</Badge>
        )}
        {cardType === 'myRented' && (
          <Badge bg="warning" text="dark" className="ms-2 mt-1">Currently Rented</Badge>
        )}
        {cardType === 'myBook' && (
          <Badge bg="success" text="light" className="ms-2 mt-1">Available</Badge>
        )}
      </Card.Header>
      
      {book.coverImage && (
        <div className="book-cover-wrapper text-center p-3">
          <div 
            className="book-cover-container mx-auto"
            style={{
              maxWidth: '220px',
              height: '280px',
              overflow: 'hidden',
              borderRadius: '8px',
              boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
              position: 'relative',
              background: '#f8f9fa'
            }}
          >
            <img 
              src={resolveIPFSUrl(book.coverImage)} 
              alt={`Cover for ${book.title}`} 
              style={{ 
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                objectPosition: 'center'
              }}
              onError={(e) => {
                console.error("Failed to load image:", book.coverImage);
                e.target.onerror = null;
                e.target.src = 'https://via.placeholder.com/350x500?text=No+Image';
              }}
            />
          </div>
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
        
        {book.rentalStartTime && (
          <Card.Text>
            <strong><i className="bi bi-calendar me-2"></i>Rented since:</strong> {book.rentalStartTime.toLocaleString()}
          </Card.Text>
        )}
        
        {extraContent}
        
        {actionButton && (
          <Button
            variant={actionButton.variant || 'primary'}
            className="w-100 mt-3"
            onClick={onClick}
            disabled={loading || actionButton.disabled}
          >
            {loading ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                {actionButton.loadingText || 'Processing...'}
              </>
            ) : (
              <>
                <i className={`bi ${actionButton.icon} me-2`}></i>
                {actionButton.text}
              </>
            )}
          </Button>
        )}
      </Card.Body>
      
      <Card.Footer className="text-muted">
        <small>
          {cardType === 'myBook' ? (
            <>
              <i className="bi bi-info-circle me-1"></i>
              Listed by you
            </>
          ) : book.rentalStartTime && cardType !== 'myRented' ? (
            <>
              <i className="bi bi-calendar-check me-1"></i>
              Rented on: {book.rentalStartTime.toLocaleString()}
            </>
          ) : book.owner ? (
            <>
              <i className="bi bi-person-circle me-1"></i>
              Listed by: {book.owner.substring(0, 6)}...{book.owner.substring(38)}
            </>
          ) : null}
        </small>
      </Card.Footer>
    </Card>
  );
};

export default BookCard; 