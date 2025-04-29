import React, { useState } from 'react';
import { useWeb3React } from '@web3-react/core';
import { Form, Button, Spinner, Card, Container, Row, Col } from 'react-bootstrap';
import { resolveIPFSUrl } from '../utils/pinataConfig';
import Notification from './Notification';
import { 
  validateBookForm, 
  validateImageFile, 
  handleImageUpload, 
  submitBookToBlockchain 
} from '../utils/bookFormUtils';
import { getContract } from '../utils/blockchainService';
import { useNotification } from '../hooks/useNotification';
import '../styles/ListBook.css'; // We'll define this CSS file below

function ListBook() {
    const { account, library } = useWeb3React();
    const { notification, showNotification, handleError, clearNotification } = useNotification();
    
    const [formData, setFormData] = useState({
        title: '',
        author: '',
        description: '',
        email: '',
        dailyPrice: '',
        deposit: ''
    });
    const [coverImage, setCoverImage] = useState(null);
    const [coverImageUrl, setCoverImageUrl] = useState('');
    const [coverImagePreview, setCoverImagePreview] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [activeSection, setActiveSection] = useState(1);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const validation = validateImageFile(file);
        if (!validation.isValid) {
            handleError(new Error(validation.errorMessage));
            return;
        }

        setCoverImage(file);
        
        const reader = new FileReader();
        reader.onloadend = () => {
            setCoverImagePreview(reader.result);
        };
        reader.readAsDataURL(file);
        setCoverImageUrl('');

        showNotification('info', `Selected image: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
    };

    const handleImageUploadClick = async () => {
        const ipfsUrl = await handleImageUpload(
            coverImage,
            {
                author: formData.author,
                description: formData.description,
                email: formData.email
            },
            () => {
                setIsUploading(true);
                showNotification('info', 'Uploading to IPFS via Pinata, please wait...');
            },
            (url) => {
                setCoverImageUrl(url);
                showNotification('success', `Image uploaded to IPFS successfully!`);
                setIsUploading(false);
            },
            (error) => {
                handleError(error);
                setIsUploading(false);
            }
        );
        
        return ipfsUrl;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const validation = validateBookForm(formData);
        if (!validation.isValid) {
            handleError(new Error(validation.errorMessage));
            return;
        }

        if (!coverImage && !coverImageUrl) {
            handleError(new Error('Please upload a cover image first.'));
            return;
        }

        setIsSubmitting(true);

        try {
            let finalImageUrl = coverImageUrl;
            if (!finalImageUrl) {
                finalImageUrl = await handleImageUploadClick();
                if (!finalImageUrl) {
                    handleError(new Error('Failed to upload cover image. Please try again.'));
                    setIsSubmitting(false);
                    return;
                }
            }

            const contract = getContract(library, true);
            if (!contract) {
                throw new Error('Failed to create contract instance. Please make sure you are connected to the correct network.');
            }

            await submitBookToBlockchain(
                { ...formData, coverImageUrl: finalImageUrl },
                {
                    contract,
                    onStart: () => showNotification('info', 'Preparing transaction...'),
                    onSubmitted: () => showNotification('info', 'Transaction submitted! Waiting for confirmation...'),
                    onSuccess: () => {
                        showNotification('success', 'Book listed successfully!');
                        resetForm();
                    },
                    onError: (error) => handleError(error)
                }
            );
        } catch (err) {
            handleError(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setFormData({
            title: '',
            author: '',
            description: '',
            email: '',
            dailyPrice: '',
            deposit: ''
        });
        setCoverImage(null);
        setCoverImageUrl('');
        setCoverImagePreview('');
        setActiveSection(1);
    };

    if (!account) {
        return (
            <div className="wallet-connect-container">
                <div className="wallet-connect-content animate__animated animate__fadeIn">
                    <div className="wallet-icon-wrapper">
                        <i className="bi bi-wallet2"></i>
                    </div>
                    <h2>Connect Your Wallet</h2>
                    <p>Please connect your blockchain wallet to list a book for rent on our decentralized marketplace.</p>
                    <div className="wallet-animation">
                        <div className="wallet-pulse"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <Container className="list-book-container">
            <div className="page-header animate__animated animate__fadeInDown">
                <h1>
                    <span className="gradient-text">List Your Book</span>
                </h1>
                <p className="text-muted">Share your books with the decentralized community</p>
            </div>
            
            <Row className="justify-content-center">
                <Col lg={10} xl={8}>
                    <Notification
                        show={notification.show}
                        type={notification.type}
                        message={notification.message}
                        onClose={clearNotification}
                    />

                    <Card className="book-listing-card animate__animated animate__fadeIn">
                        <Card.Header className="listing-card-header">

                            <div className="progress-indicator">
                                <div className={`progress-step ${activeSection >= 1 ? 'active' : ''}`}>
                                    <div className="step-number">1</div>
                                    <div className="step-label">Book Details</div>
                                </div>
                                <div className={`progress-connector ${activeSection >= 2 ? 'active' : ''}`}></div>
                                <div className={`progress-step ${activeSection >= 2 ? 'active' : ''}`}>
                                    <div className="step-number">2</div>
                                    <div className="step-label">Cover Image</div>
                                </div>
                                <div className={`progress-connector ${activeSection >= 3 ? 'active' : ''}`}></div>
                                <div className={`progress-step ${activeSection >= 3 ? 'active' : ''}`}>
                                    <div className="step-number">3</div>
                                    <div className="step-label">Pricing</div>
                                </div>
                            </div>
                        </Card.Header>
                        
                        <Card.Body className="listing-card-body">
                            <Form onSubmit={handleSubmit} className="book-listing-form">
                                <div className={`form-section book-details ${activeSection === 1 ? 'active' : ''}`}>
                                    <div className="section-title animate__animated animate__fadeIn">
                                        <span className="section-number">1</span>
                                        <h3>Book Details</h3>
                                    </div>

                                    <Form.Group className="form-group animate__animated animate__fadeInUp" style={{animationDelay: '0.1s'}}>
                                        <Form.Label>
                                            <i className="bi bi-bookmark-fill input-icon"></i>
                                            Book Title
                                        </Form.Label>
                                        <Form.Control
                                            type="text"
                                            name="title"
                                            value={formData.title}
                                            onChange={handleInputChange}
                                            placeholder="Enter book title"
                                            required
                                            disabled={isSubmitting}
                                            className="custom-input"
                                        />
                                    </Form.Group>

                                    <Form.Group className="form-group animate__animated animate__fadeInUp" style={{animationDelay: '0.2s'}}>
                                        <Form.Label>
                                            <i className="bi bi-person-fill input-icon"></i>
                                            Author Name
                                        </Form.Label>
                                        <Form.Control
                                            type="text"
                                            name="author"
                                            value={formData.author}
                                            onChange={handleInputChange}
                                            placeholder="Enter author name"
                                            required
                                            disabled={isSubmitting}
                                            className="custom-input"
                                        />
                                    </Form.Group>

                                    <Form.Group className="form-group animate__animated animate__fadeInUp" style={{animationDelay: '0.3s'}}>
                                        <Form.Label>
                                            <i className="bi bi-card-text input-icon"></i>
                                            Book Description
                                        </Form.Label>
                                        <Form.Control
                                            as="textarea"
                                            rows={4}
                                            name="description"
                                            value={formData.description}
                                            onChange={handleInputChange}
                                            placeholder="Enter book description"
                                            disabled={isSubmitting}
                                            className="custom-textarea"
                                        />
                                    </Form.Group>

                                    <Form.Group className="form-group animate__animated animate__fadeInUp" style={{animationDelay: '0.4s'}}>
                                        <Form.Label>
                                            <i className="bi bi-envelope-fill input-icon"></i>
                                            Contact Email
                                        </Form.Label>
                                        <Form.Control
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            placeholder="Enter your contact email"
                                            required
                                            disabled={isSubmitting}
                                            className="custom-input"
                                        />
                                        <Form.Text className="text-helper">
                                            <i className="bi bi-info-circle me-1"></i>
                                            This email will be visible to renters for communication
                                        </Form.Text>
                                    </Form.Group>

                                    <div className="button-group animate__animated animate__fadeInUp" style={{animationDelay: '0.5s'}}>
                                        <Button 
                                            variant="primary" 
                                            className="next-button" 
                                            onClick={() => setActiveSection(2)}
                                            disabled={!formData.title || !formData.author || !formData.email}
                                        >
                                            Next <i className="bi bi-arrow-right-circle ms-1"></i>
                                        </Button>
                                    </div>
                                </div>

                                <div className={`form-section cover-image ${activeSection === 2 ? 'active' : ''}`}>
                                    <div className="section-title animate__animated animate__fadeIn">
                                        <span className="section-number">2</span>
                                        <h3>Cover Image</h3>
                                    </div>

                                    <div className="cover-image-container animate__animated animate__fadeInUp">
                                        <div className="row">
                                            <div className="col-md-6">
                                                <div className="image-upload-area">
                                                    <Form.Label className="upload-label">
                                                        <i className="bi bi-image-fill input-icon"></i>
                                                        Cover Image
                                                    </Form.Label>
                                                    <div className="file-drop-zone">
                                                        <Form.Control
                                                            type="file"
                                                            accept="image/*"
                                                            onChange={handleImageChange}
                                                            disabled={isSubmitting || isUploading}
                                                            className="file-input"
                                                            id="coverImageInput"
                                                        />
                                                        <label htmlFor="coverImageInput" className="file-label">
                                                            <div className="drop-icon">
                                                                <i className="bi bi-cloud-arrow-up"></i>
                                                            </div>
                                                            <div className="drop-text">
                                                                Click to browse or drag an image here
                                                            </div>
                                                        </label>
                                                    </div>
                                                    
                                                    <div className="d-flex mt-3">
                                                        <Button
                                                            variant="primary"
                                                            onClick={handleImageUploadClick}
                                                            disabled={!coverImage || isUploading || isSubmitting || coverImageUrl}
                                                            className="upload-ipfs-button"
                                                            type="button"
                                                        >
                                                            {isUploading ? (
                                                                <>
                                                                    <Spinner animation="border" size="sm" className="me-2" /> 
                                                                    Uploading to IPFS...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <i className="bi bi-cloud-upload me-2"></i> 
                                                                    Upload to IPFS
                                                                </>
                                                            )}
                                                        </Button>
                                                    </div>
                                                    
                                                    <Form.Text className="text-helper mt-2">
                                                        <i className="bi bi-info-circle me-1"></i>
                                                        Your book cover will be stored on the decentralized IPFS network
                                                    </Form.Text>
                                                </div>
                                            </div>
                                            
                                            <div className="col-md-6">
                                                <div className="image-preview-container">
                                                    {(!coverImagePreview && !coverImageUrl) ? (
                                                        <div className="no-image-placeholder">
                                                            <i className="bi bi-book"></i>
                                                            <p>No image selected</p>
                                                        </div>
                                                    ) : coverImagePreview && !coverImageUrl ? (
                                                        <div className="preview-wrapper">
                                                            <div className="book-cover-preview">
                                                                <img
                                                                    src={coverImagePreview}
                                                                    alt="Book cover preview"
                                                                    className="preview-image"
                                                                />
                                                            </div>
                                                            <p className="preview-label">Image Preview</p>
                                                        </div>
                                                    ) : (
                                                        <div className="preview-wrapper">
                                                            <div className="book-cover-preview uploaded">
                                                                <img
                                                                    src={resolveIPFSUrl(coverImageUrl)}
                                                                    alt="Book cover on IPFS"
                                                                    className="preview-image"
                                                                />
                                                                <div className="ipfs-badge">
                                                                    <i className="bi bi-lock"></i> IPFS
                                                                </div>
                                                            </div>
                                                            <div className="text-success upload-success">
                                                                <i className="bi bi-check-circle me-1"></i> Uploaded to IPFS
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="button-group animate__animated animate__fadeInUp" style={{animationDelay: '0.2s'}}>
                                        <Button 
                                            variant="outline-secondary" 
                                            className="back-button" 
                                            onClick={() => setActiveSection(1)}
                                        >
                                            <i className="bi bi-arrow-left-circle me-1"></i> Back
                                        </Button>
                                        <Button 
                                            variant="primary" 
                                            className="next-button" 
                                            onClick={() => setActiveSection(3)}
                                            disabled={!coverImage}
                                        >
                                            Next <i className="bi bi-arrow-right-circle ms-1"></i>
                                        </Button>
                                    </div>
                                </div>

                                <div className={`form-section pricing ${activeSection === 3 ? 'active' : ''}`}>
                                    <div className="section-title animate__animated animate__fadeIn">
                                        <span className="section-number">3</span>
                                        <h3>Pricing Details</h3>
                                    </div>

                                    <div className="pricing-grid">
                                        <Form.Group className="form-group animate__animated animate__fadeInUp" style={{animationDelay: '0.1s'}}>
                                            <Form.Label>
                                                <i className="bi bi-currency-dollar input-icon"></i>
                                                Price per Minute (ETH)
                                            </Form.Label>
                                            <Form.Control
                                                type="number"
                                                step="0.000001"
                                                name="dailyPrice"
                                                value={formData.dailyPrice}
                                                onChange={handleInputChange}
                                                placeholder="Enter price per minute"
                                                required
                                                disabled={isSubmitting}
                                                className="custom-input"
                                            />
                                            <Form.Text className="text-helper">
                                                <i className="bi bi-info-circle me-1"></i>
                                                Recommended: 0.0001 ETH per minute for testing
                                            </Form.Text>
                                        </Form.Group>

                                        <Form.Group className="form-group animate__animated animate__fadeInUp" style={{animationDelay: '0.2s'}}>
                                            <Form.Label>
                                                <i className="bi bi-shield-lock-fill input-icon"></i>
                                                Deposit (ETH)
                                            </Form.Label>
                                            <Form.Control
                                                type="number"
                                                step="0.000001"
                                                name="deposit"
                                                value={formData.deposit}
                                                onChange={handleInputChange}
                                                placeholder="Enter deposit amount"
                                                required
                                                disabled={isSubmitting}
                                                className="custom-input"
                                            />
                                            <Form.Text className="text-helper">
                                                <i className="bi bi-info-circle me-1"></i>
                                                Deposit should be greater than or equal to the price per minute
                                            </Form.Text>
                                        </Form.Group>
                                    </div>

                                    <div className="pricing-info-box animate__animated animate__fadeInUp" style={{animationDelay: '0.3s'}}>
                                        <div className="info-header">
                                            <i className="bi bi-info-circle"></i>
                                            <h4>How Pricing Works</h4>
                                        </div>
                                        <ul>
                                            <li>Readers will pay the <strong>price per minute</strong> for the time they rent your book</li>
                                            <li>The <strong>deposit</strong> is held in escrow and returned when the book is returned</li>
                                            <li>All transactions are secured by smart contracts on the blockchain</li>
                                        </ul>
                                    </div>

                                    <div className="button-group animate__animated animate__fadeInUp" style={{animationDelay: '0.4s'}}>
                                        <Button 
                                            variant="outline-secondary" 
                                            className="back-button" 
                                            onClick={() => setActiveSection(2)}
                                        >
                                            <i className="bi bi-arrow-left-circle me-1"></i> Back
                                        </Button>
                                        <Button
                                            variant="primary"
                                            type="submit"
                                            disabled={isSubmitting || isUploading || !formData.dailyPrice || !formData.deposit}
                                            className="submit-button"
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <Spinner
                                                        as="span"
                                                        animation="border"
                                                        size="sm"
                                                        role="status"
                                                        aria-hidden="true"
                                                        className="me-2"
                                                    />
                                                    Listing Book...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="bi bi-check2-circle me-2"></i>
                                                    Complete Listing
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </Form>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
}

export default ListBook;