# Contributing to AssetSentinel

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to the AssetSentinel project.

## Code of Conduct

- Be respectful and inclusive
- Use clear, descriptive language in issues and PRs
- Focus on constructive feedback
- Report security issues privately to maintainers

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/asset-sentinel.git
   cd asset-sentinel
   ```
3. **Create a development branch**:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/issue-number
   ```
4. **Set up your environment** (see [README.md](README.md#installation))

## Development Workflow

### Before Starting

- Check [open issues](https://github.com/hemapriyan-rk/asset-sentinel/issues) to avoid duplicate work
- For major features, open a discussion issue first
- Assign yourself to issues you're working on

### Making Changes

#### Backend (Python/FastAPI)

1. **Create a feature branch** from `develop`:
   ```bash
   git checkout -b feature/add-export-api
   ```

2. **Write clean code**:
   - Follow PEP 8 style guide
   - Add docstrings to functions
   - Use type hints
   - Keep functions small and focused

3. **Add error handling**:
   ```python
   try:
       # business logic
   except SpecificException as e:
       logger.error(f"Detailed error message: {e}")
       raise HTTPException(status_code=500, detail="User-friendly message")
   ```

4. **Write tests**:
   ```bash
   # Create tests in api/tests/
   pytest api/tests/test_your_feature.py -v
   ```

#### Frontend (TypeScript/React)

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/add-dark-mode
   ```

2. **Follow React best practices**:
   - Use functional components with hooks
   - Memoize expensive computations
   - Use TypeScript for type safety
   - Keep components focused

3. **Styling**:
   - Use CSS modules or Tailwind (project standard)
   - Maintain responsive design (mobile-first)
   - Test on multiple viewport sizes

4. **Testing**:
   ```bash
   cd web
   npm test
   ```

### Code Standards

#### Python Backend
```python
# Good: Clear, documented, typed
def calculate_decision_intelligence(
    baseline_mean: float,
    baseline_std: float,
    current_value: float
) -> tuple[float, str]:
    """
    Calculate DI score and state classification.
    
    Args:
        baseline_mean: Mean of baseline telemetry
        baseline_std: Std deviation of baseline
        current_value: Current telemetry value
        
    Returns:
        Tuple of (di_score, state) where state is NORMAL/WARNING/CRITICAL
    """
    if baseline_std == 0:
        return 0.0, "NORMAL"
    
    di_score = (current_value - baseline_mean) / baseline_std
    
    if di_score >= 3.0:
        return di_score, "CRITICAL"
    elif di_score >= 2.0:
        return di_score, "WARNING"
    else:
        return di_score, "NORMAL"
```

#### TypeScript/React Frontend
```typescript
// Good: Typed, clear, maintainable
interface KPIMetric {
  label: string;
  value: number;
  unit: string;
  status: "normal" | "warning" | "critical";
}

const KPICard: React.FC<{ metric: KPIMetric }> = ({ metric }) => {
  const statusColor = {
    normal: "bg-green-100",
    warning: "bg-yellow-100",
    critical: "bg-red-100"
  };

  return (
    <div className={`p-4 rounded ${statusColor[metric.status]}`}>
      <h3>{metric.label}</h3>
      <p className="text-2xl font-bold">{metric.value}</p>
      <p className="text-sm">{metric.unit}</p>
    </div>
  );
};
```

## Commit Message Guidelines

Write clear, descriptive commit messages following conventional commits:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation
- **style**: Code style changes (no logic)
- **refactor**: Code restructuring
- **perf**: Performance optimization
- **test**: Test additions/modifications
- **chore**: Build, CI/CD, dependencies

### Examples

```
feat(api): add webhook notification system
- Implement endpoint configuration
- Add event-based triggering
- Support retry logic

Closes #123
```

```
fix(ui): correct responsive layout on mobile
- Fix flex layout for small screens
- Adjust font sizes for readability

Fixes #456
```

```
docs: update API endpoint documentation
```

```
refactor(backend): extract network computation service

This improves code reusability and testability.
```

## Pull Request Process

1. **Before submitting**:
   - Update with latest `develop` branch
   - Run all tests locally
   - Add/update documentation
   - Add CHANGELOG entry

2. **Create PR with template**:
   ```markdown
   ## Description
   Brief summary of changes

   ## Type of Change
   - [ ] Bug fix (non-breaking)
   - [ ] New feature (non-breaking)
   - [ ] Breaking change
   - [ ] Documentation update

   ## Related Issues
   Closes #123

   ## Testing
   - [x] Unit tests pass
   - [x] Manual testing completed
   - [x] No console errors

   ## Checklist
   - [x] Code follows style guidelines
   - [x] Added tests for new features
   - [x] Documentation updated
   - [x] No new warnings generated
   ```

3. **Address review feedback**:
   - Push changes to the same branch
   - Respond to comments
   - Request re-review when ready

4. **Merge**:
   - Maintainer will merge after approval
   - Delete feature branch after merge

## Testing Guidelines

### Backend Testing
```bash
cd api

# Run all tests
pytest tests/ -v

# Run specific test file
pytest tests/test_auth.py -v

# Run with coverage
pytest --cov=api tests/
```

Example test:
```python
import pytest
from api.models import User
from api.auth import hash_password

def test_user_creation():
    """Test that users are created with hashed passwords."""
    user = User(
        username="testuser",
        hashed_password=hash_password("testpass123"),
        role="admin"
    )
    assert user.username == "testuser"
    assert user.hashed_password != "testpass123"  # Should be hashed
```

### Frontend Testing
```bash
cd web

# Run all tests
npm test

# Run specific test
npm test KPIGrid

# Coverage report
npm test -- --coverage
```

## Documentation

### Python Docstrings
```python
def analyze_asset(asset_id: str, telemetry_data: dict) -> AnalysisResult:
    """
    Perform anomaly detection on asset telemetry.
    
    Args:
        asset_id: Unique identifier of the asset
        telemetry_data: Dictionary with voltage, current, temperature readings
        
    Returns:
        AnalysisResult with state (NORMAL/WARNING/CRITICAL) and DI score
        
    Raises:
        AssetNotFoundError: If asset doesn't exist
        InvalidTelemetryError: If data validation fails
        
    Example:
        >>> result = analyze_asset("MTR-001", {
        ...     "voltage": 480.5,
        ...     "current": 100.2
        ... })
        >>> print(result.state)
        CRITICAL
    """
```

### TypeScript JSDoc
```typescript
/**
 * Fetch all assets owned by current user
 * @async
 * @returns Promise resolving to array of assets
 * @throws {Error} If authentication fails or API is down
 * @example
 * const assets = await fetchAssets();
 * console.log(assets[0].id);
 */
async function fetchAssets(): Promise<Asset[]> {
  // implementation
}
```

## Reporting Issues

### Bug Report Template
```markdown
## Description
Clear description of the bug

## Steps to Reproduce
1. Login as demo user
2. Navigate to /assets
3. Click "Add Asset"
4. Bug occurs here...

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Screenshots
If applicable, add screenshots

## Environment
- OS: Windows 10
- Browser: Chrome 120
- Node: v18.17
- Python: 3.11
```

### Feature Request Template
```markdown
## Feature Description
What feature would you like?

## Use Case
Why would this be useful?

## Proposed Solution
How should it work?

## Alternatives
Alternative approaches considered

## Additional Context
Any other information
```

## Development Tips

### Debugging Backend
```python
# Add logging
import logging
logger = logging.getLogger(__name__)
logger.debug(f"Asset DI score: {di_score}")

# Use breakpoints
import pdb
pdb.set_trace()  # Debugger will pause here

# Or use VS Code debugger with configuration
```

### Debugging Frontend
```typescript
// Console logging
console.log("Current state:", state);
console.error("Error occurred:", error);

// React DevTools browser extension
// Redux DevTools for state debugging
// VS Code debugger integration
```

## Performance Guidelines

### Backend
- Use database indexes on frequently queried columns
- Minimize database queries (batch operations)
- Cache computed results when appropriate
- Use async operations for I/O

### Frontend
- Lazy load components
- Memoize expensive computations
- Minimize re-renders
- Optimize bundle size

## Security Best Practices

- **Never commit secrets** to version control
- Use `.env` files for sensitive data
- Validate all user inputs
- Use parameterized queries (SQLAlchemy handles this)
- Implement rate limiting for APIs
- Use HTTPS in production
- Keep dependencies updated

## Questions?

- Open a GitHub discussion
- Check existing documentation
- Ask in pull request comments
- Contact maintainers

## License

By contributing, you agree that your contributions are licensed under the same MIT license as the project.

---

**Thank you for contributing to AssetSentinel!** 🚀
