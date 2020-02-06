import { Button, FormGroup, InputGroup, Intent } from '@blueprintjs/core'
import React, { FC, useState } from 'react'

interface Props {
  onLogin: (email, password) => void
}

export const LoginForm: FC<Props> = props => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const onSubmit = e => {
    e.preventDefault()
    props.onLogin(email, password)
  }

  return (
    <form onSubmit={onSubmit}>
      <FormGroup label="E-mail">
        <InputGroup
          tabIndex={1}
          value={email}
          onChange={e => setEmail(e.target.value)}
          type="text"
          id="email"
          autoFocus={true}
        />
      </FormGroup>

      <FormGroup label="Password">
        <InputGroup
          tabIndex={2}
          value={password}
          onChange={e => setPassword(e.target.value)}
          type="password"
          id="password"
        />
      </FormGroup>

      <Button
        tabIndex={3}
        type="submit"
        id="btn-signin"
        text="Sign in"
        disabled={!email || !password}
        intent={Intent.PRIMARY}
      />
    </form>
  )
}
