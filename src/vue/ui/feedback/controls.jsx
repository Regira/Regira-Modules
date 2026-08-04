import Icon from "../icons/Icon.vue"

export const Success = (props) => {
    const msg = props.msg || "Success!"

    return (
        <div className="bg-success text-light p-3">
            <slot name="message">{msg}</slot>
        </div>
    )
}

export const Pending = (props) => {
    const msg = props.msg || "Loading ..."

    return (
        <div className="bg-light text-info p-3">
            <slot name="message">{msg}</slot>
        </div>
    )
}

export const ErrorSummary = (props) => {
    const msg = props.msg || "Unfortunately, an error has occurred."
    return (
        <div class="bg-danger text-light p-3">
            <slot name="message">
                <Icon name="error" /> {msg}
            </slot>
            <slot name="summary">
                {props.errors &&
                    Object.entries(props.errors).map(([code, msgs]) => (
                        <ul class="list-unstyled mt-2" key={code}>
                            <li>
                                <b>{code}</b>
                                <ul>
                                    {msgs.map((err) => (
                                        <li key={err}>{err}</li>
                                    ))}
                                </ul>
                            </li>
                        </ul>
                    ))}
            </slot>
        </div>
    )
}

export const Feedback = (props, { emit }) => {
    const { isPending, isSuccess, isFailed, pendingMessage, successMessage, errorMessage, error, reset } = props

    const handleClose = (e) => {
        e.stopPropagation() // prevent triggering buttons underneath
        emit("close", props)
        reset()
    }

    if (!(isPending || isSuccess || isFailed)) {
        return
    }

    return (
        !props.hide && (
            <div class="mb-1 position-relative border rounded">
                <div class="col-12">
                    <slot name="close-button">
                        <button type="button" class="btn btn-sm btn-light float-right m-1 position-absolute end-0" onClick={handleClose}>
                            <Icon name="times" />
                        </button>
                    </slot>
                    {isPending && (
                        <slot name="pending">
                            <Pending msg={pendingMessage} />
                        </slot>
                    )}
                    {isSuccess && (
                        <slot name="success">
                            <Success msg={successMessage} />
                        </slot>
                    )}
                    {isFailed && (
                        <slot name="error">
                            <ErrorSummary msg={errorMessage} errors={error} />
                        </slot>
                    )}
                </div>
            </div>
        )
    )
}
